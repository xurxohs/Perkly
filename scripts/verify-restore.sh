#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must point to an empty disposable database}"

sha256sum --check "$BACKUP_FILE.sha256"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT COUNT(*) AS migration_count FROM "_prisma_migrations";'
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT COUNT(*) AS user_count FROM "User";'
echo "Restore verification completed successfully."
