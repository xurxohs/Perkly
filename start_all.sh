#!/usr/bin/env bash
set -euo pipefail

# Centralized Start Script for Perkly.
# Usage:
#   ./start_all.sh            # dev mode: Next/Nest watch servers
#   ./start_all.sh dev
#   ./start_all.sh server     # server mode: Prisma migrations + production servers

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-${PERKLY_MODE:-dev}}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PIDS=()

cleanup() {
    echo -e "\n${BLUE}Stopping services...${NC}"
    if [ "${#PIDS[@]}" -gt 0 ]; then
        kill "${PIDS[@]}" 2>/dev/null || true
    fi
    exit
}

trap cleanup SIGINT SIGTERM

load_backend_env() {
    if [ -f "$ROOT_DIR/apps/web/perkly/backend/.env" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            line="${line#"${line%%[![:space:]]*}"}"
            line="${line%"${line##*[![:space:]]}"}"

            if [ -z "$line" ] || [[ "$line" == \#* ]] || [[ "$line" != *=* ]]; then
                continue
            fi

            local key="${line%%=*}"
            local value="${line#*=}"
            key="${key%"${key##*[![:space:]]}"}"
            value="${value#"${value%%[![:space:]]*}"}"

            if [[ "$value" == \"*\" && "$value" == *\" ]]; then
                value="${value:1:${#value}-2}"
            elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
                value="${value:1:${#value}-2}"
            fi

            if [ -z "${!key:-}" ]; then
                export "$key=$value"
            fi
        done < "$ROOT_DIR/apps/web/perkly/backend/.env"
    fi
}

start_service() {
    local name="$1"
    local dir="$2"
    shift 2

    echo -e "${GREEN}Starting ${name}...${NC}"
    (
        cd "$dir"
        "$@"
    ) &
    PIDS+=("$!")
}

run_server_migrations() {
    echo -e "${BLUE}Checking server PostgreSQL and applying Prisma migrations...${NC}"
    load_backend_env

    if [ -z "${DATABASE_URL:-}" ]; then
        echo -e "${RED}DATABASE_URL is not set.${NC}"
        echo "Set it in the server environment or in perkly/backend/.env."
        exit 1
    fi

    if [[ "$DATABASE_URL" == *"localhost:5432"* || "$DATABASE_URL" == *"127.0.0.1:5432"* ]]; then
        echo -e "${YELLOW}DATABASE_URL points to localhost:5432.${NC}"
        echo "That is only correct if PostgreSQL runs on the same server where this script is executed."

        if [ "${ALLOW_LOCAL_DB:-0}" = "1" ]; then
            echo -e "${YELLOW}ALLOW_LOCAL_DB=1 is set; continuing with local PostgreSQL.${NC}"
        elif [ "$(uname -s)" = "Darwin" ]; then
            echo "This script is running on macOS, so localhost means this Mac, not the VPS."
            echo "Run this command on the server, or pass a server-reachable DATABASE_URL:"
            echo "  export DATABASE_URL='postgresql://USER:PASSWORD@SERVER_HOST:5432/perkly_db?schema=public'"
            echo "  ./start_all.sh server"
            echo -e "${RED}Stopping before migrations to avoid applying server startup against a Mac-local DB URL.${NC}"
            exit 1
        elif command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            echo -e "${GREEN}Local PostgreSQL is reachable on this server; continuing.${NC}"
        else
            echo "Could not confirm PostgreSQL on localhost:5432 for this server."
            echo "If PostgreSQL really runs on this same server, run:"
            echo "  ALLOW_LOCAL_DB=1 ./start_all.sh server"
            echo -e "${RED}Stopping before migrations.${NC}"
            exit 1
        fi
    fi

    (
        cd "$ROOT_DIR/apps/web/perkly/backend"
        npx prisma migrate deploy
    ) || {
        echo -e "${RED}Prisma migration failed.${NC}"
        echo "Check that the server PostgreSQL is reachable from DATABASE_URL."
        echo "Current DATABASE_URL host must point to the server database, not a local-only DB."
        exit 1
    }
}

build_for_server() {
    echo -e "${BLUE}Building Perkly backend/frontend for server...${NC}"
    (cd "$ROOT_DIR/apps/web/perkly/backend" && npm run build)
    (cd "$ROOT_DIR/apps/web/perkly/frontend" && npm run build)
}

start_dev() {
    echo -e "${PURPLE}Starting all services in dev mode...${NC}"

    start_service "Perkly Backend (dev, port 3001)" "$ROOT_DIR/apps/web/perkly/backend" npm run start:dev
    start_service "Perkly Frontend (dev, port 3000)" "$ROOT_DIR/apps/web/perkly/frontend" npm run dev

    echo -e "${PURPLE}All dev services are launching.${NC}"
    echo "Perkly Frontend: http://localhost:3000"
    echo "Perkly Backend:  http://localhost:3001"
}

start_server() {
    echo -e "${PURPLE}Starting all services in server mode...${NC}"
    echo -e "${YELLOW}This mode expects PostgreSQL to already exist on your server.${NC}"

    run_server_migrations
    build_for_server

    start_service "Perkly Backend (prod, port 3001)" "$ROOT_DIR/apps/web/perkly/backend" npm run start:prod
    start_service "Perkly Frontend (prod, port 3000)" "$ROOT_DIR/apps/web/perkly/frontend" npm run start -- -p 3000

    echo -e "${PURPLE}All server services are launching.${NC}"
    echo "Perkly Frontend: http://localhost:3000"
    echo "Perkly Backend:  http://localhost:3001"
}

case "$MODE" in
    dev)
        start_dev
        ;;
    server|prod|production)
        start_server
        ;;
    *)
        echo -e "${RED}Unknown mode: ${MODE}${NC}"
        echo "Use: ./start_all.sh dev OR ./start_all.sh server"
        exit 1
        ;;
esac

echo -e "Press ${PURPLE}Ctrl+C${NC} to stop everything."
wait
