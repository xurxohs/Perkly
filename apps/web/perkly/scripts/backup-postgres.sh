#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
umask 077

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/perkly-$timestamp.dump"
if ! pg_dump --format=custom --no-owner --no-acl --file="$target" "$DATABASE_URL"; then
    rm -f "$target"
    if [[ "$DATABASE_URL" == *"localhost:5432"* || "$DATABASE_URL" == *"127.0.0.1:5432"* ]] \
        && command -v sudo >/dev/null 2>&1; then
        database_url="${DATABASE_URL%%\?*}"
        database_name="${database_url##*/}"
        sudo -u postgres pg_dump --format=custom --no-owner --no-acl \
            --dbname="$database_name" > "$target"
    else
        echo "Unable to create a complete PostgreSQL backup" >&2
        exit 1
    fi
fi
pg_restore --list "$target" >/dev/null
sha256sum "$target" > "$target.sha256"
find "$BACKUP_DIR" -type f \( -name 'perkly-*.dump' -o -name 'perkly-*.dump.sha256' \) -mtime "+$RETENTION_DAYS" -delete
echo "Backup created and structurally verified: $target"
