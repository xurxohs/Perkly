#!/bin/bash
set -euo pipefail

# ============================================
# 🚀 Perkly Auto-Deploy Script
# Server: 95.130.227.217 (Eskiz VPS)
# ============================================

SERVER_IP="95.130.227.217"
SERVER_USER="root"
SERVER_PASS="${SERVER_PASS:-}"
SERVER_PORT="22"
PROJECT_DIR="/var/www/perkly"  # Путь к проекту на сервере
DATABASE_URL_OVERRIDE="${DATABASE_URL:-}"
BASELINE_MIGRATION="20260630152000_production_baseline"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 Perkly Deploy — подключаюсь к серверу ${SERVER_IP}...${NC}"

SSH_CMD=(ssh -o StrictHostKeyChecking=accept-new -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_IP}")

if [ -n "$SERVER_PASS" ]; then
    # Проверяем наличие sshpass только для password-mode
    if ! command -v sshpass &> /dev/null; then
        echo -e "${RED}❌ sshpass не установлен. Устанавливаю...${NC}"
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
            echo -e "${RED}Не удалось установить sshpass автоматически.${NC}"
            echo -e "Установите вручную: ${BLUE}brew install hudochenkov/sshpass/sshpass${NC}"
            echo -e "Или используйте SSH-ключи: ${BLUE}ssh-copy-id root@${SERVER_IP}${NC}"
            exit 1
        }
    fi
    SSH_CMD=(sshpass -p "${SERVER_PASS}" "${SSH_CMD[@]}")
else
    echo -e "${BLUE}SERVER_PASS не задан, пробую подключение через SSH-ключ.${NC}"
fi

echo -e "${GREEN}📡 Подключаюсь и деплою...${NC}"

REMOTE_PROJECT_DIR="$(printf "%q" "$PROJECT_DIR")"
REMOTE_DATABASE_URL_OVERRIDE="$(printf "%q" "$DATABASE_URL_OVERRIDE")"

"${SSH_CMD[@]}" \
    "PROJECT_DIR=${REMOTE_PROJECT_DIR} DATABASE_URL_OVERRIDE=${REMOTE_DATABASE_URL_OVERRIDE} BASELINE_MIGRATION=${BASELINE_MIGRATION} bash -s" << 'REMOTE_COMMANDS'

set -euo pipefail
export NODE_ENV=production

load_backend_env() {
    local env_file="$1"

    if [ ! -f "$env_file" ]; then
        return 0
    fi

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

        if ! [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
            continue
        fi

        if [[ "$value" == \"*\" && "$value" == *\" ]]; then
            value="${value:1:${#value}-2}"
        elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
            value="${value:1:${#value}-2}"
        fi

        if [ -z "${!key:-}" ]; then
            export "$key=$value"
        fi
    done < "$env_file"
}

redact_database_url() {
    printf "%s\n" "$DATABASE_URL" | sed -E 's#(postgresql://[^:]+):[^@]+@#\1:***@#'
}

psql_database_url() {
    printf "%s\n" "$DATABASE_URL" | sed -E 's/[?].*$//'
}

backup_database() {
    if ! command -v pg_dump >/dev/null 2>&1 || ! command -v pg_restore >/dev/null 2>&1; then
        echo "❌ pg_dump/pg_restore не найдены. Миграции без проверенного backup запрещены."
        exit 1
    fi

    local backup_dir="$PROJECT_DIR/backups"
    local timestamp
    timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
    local backup_file="$backup_dir/perkly-predeploy-$timestamp.dump"
    mkdir -p "$backup_dir"
    chmod 700 "$backup_dir"
    umask 077

    echo "💾 Создаю backup перед миграциями..."
    if ! pg_dump --format=custom --no-owner --no-acl \
        --file="$backup_file" "$(psql_database_url)"; then
        rm -f "$backup_file"
        if [[ "$DATABASE_URL" == *"localhost:5432"* || "$DATABASE_URL" == *"127.0.0.1:5432"* ]] \
            && command -v sudo >/dev/null 2>&1; then
            local database_name
            database_name="$(psql_database_url)"
            database_name="${database_name##*/}"
            echo "⚠️ У пользователя приложения недостаточно прав для полного backup. Повторяю через системного postgres..."
            sudo -u postgres pg_dump --format=custom --no-owner --no-acl \
                --dbname="$database_name" > "$backup_file"
        else
            echo "❌ Не удалось создать полный backup PostgreSQL."
            exit 1
        fi
    fi
    pg_restore --list "$backup_file" >/dev/null
    sha256sum "$backup_file" > "$backup_file.sha256"
    find "$backup_dir" -type f \
        \( -name 'perkly-predeploy-*.dump' -o -name 'perkly-predeploy-*.dump.sha256' \) \
        -mtime +14 -delete
    echo "✅ Backup создан и проверен: $backup_file"
}

ensure_prisma_baseline() {
    if [ ! -d "prisma/migrations/${BASELINE_MIGRATION}" ]; then
        return 0
    fi

    if ! command -v psql >/dev/null 2>&1; then
        echo "⚠️ psql не найден, baseline-check пропущен. Если БД не управлялась Prisma Migrate, migrate deploy остановится."
        return 0
    fi

    local has_migrations_table
    has_migrations_table="$(psql "$(psql_database_url)" -tAc "SELECT to_regclass('public._prisma_migrations') IS NOT NULL" | tr -d '[:space:]')"

    if [ "$has_migrations_table" = "f" ]; then
        echo "🗄 Production DB уже существует без Prisma Migrate history. Отмечаю baseline как applied..."
        ./node_modules/.bin/prisma migrate resolve --applied "$BASELINE_MIGRATION"
    fi
}

cd "$PROJECT_DIR" || { echo "❌ Папка $PROJECT_DIR не найдена!"; exit 1; }

echo "📥 Подтягиваю новый код..."
git pull origin main 2>/dev/null || git pull 2>/dev/null || echo "⚠️ Git pull пропущен (не git-репо)"

echo ""
echo "🔧 Пересобираю Backend и обновляю БД..."
cd backend
# Build tools (Nest CLI, TypeScript, Prisma CLI) live in devDependencies.
# NODE_ENV is already production, so request them explicitly for the build.
npm ci --include=dev

if [ -n "${DATABASE_URL_OVERRIDE:-}" ]; then
    export DATABASE_URL="$DATABASE_URL_OVERRIDE"
    echo "🗄 Использую DATABASE_URL, переданный в deploy.sh"
fi

load_backend_env ".env"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL не найден. Добавьте его в /var/www/perkly/backend/.env или передайте при запуске deploy.sh."
    exit 1
fi

echo "🗄 Server DATABASE_URL: $(redact_database_url)"

if [[ "$DATABASE_URL" == *"localhost:5432"* || "$DATABASE_URL" == *"127.0.0.1:5432"* ]]; then
    echo "🗄 БД настроена как локальная для VPS. Проверяю PostgreSQL на сервере..."
    pg_isready -h localhost -p 5432 >/dev/null
fi

echo "🗄 Применяю Prisma migrations..."
ensure_prisma_baseline
backup_database
./node_modules/.bin/prisma migrate deploy

npm run build
pm2 restart perkly-backend --update-env || pm2 start dist/src/main.js --name perkly-backend --update-env
sleep 2
curl --fail --silent --show-error --retry 10 --retry-delay 3 \
    --retry-connrefused \
    "http://127.0.0.1:${PORT:-3001}/health/ready" >/dev/null
echo "✅ Backend перезапущен"

echo ""
echo "💻 Пересобираю Frontend..."
cd ../frontend
pkill -9 -f "next build" || true
rm -rf .next/lock
# TypeScript and the lint/build toolchain are required during deployment.
npm ci --include=dev
npm run build
pm2 restart frontend --update-env || pm2 start npm --name frontend -- start
curl --fail --silent --show-error --retry 10 --retry-delay 3 \
    --retry-connrefused \
    "http://127.0.0.1:3000/admin/login" >/dev/null
echo "✅ Frontend перезапущен"

echo ""
echo "📊 Статус сервисов:"
pm2 status

echo ""
echo "🎉 Деплой завершён успешно!"
REMOTE_COMMANDS

echo ""
echo -e "${PURPLE}✅ Деплой завершён!${NC}"
echo -e "Сайт: ${BLUE}https://perkly.uz${NC}"
