#!/usr/bin/env bash
set -euo pipefail

required_env=(
  DATABASE_URL REDIS_URL JWT_SECRET TELEGRAM_BOT_TOKEN
  FRONTEND_URL PUBLIC_API_URL CORS_ORIGINS
  CLICK_SECRET_KEY CLICK_MERCHANT_ID CLICK_SERVICE_ID
)

failures=()
for key in "${required_env[@]}"; do
  if [ -z "${!key:-}" ]; then
    failures+=("$key is required")
  fi
done

jwt_secret="${JWT_SECRET:-}"
if [ "${#jwt_secret}" -lt 32 ]; then
  failures+=("JWT_SECRET must contain at least 32 characters")
fi
if [[ "${DATABASE_URL:-}" != postgresql://* ]]; then
  failures+=("DATABASE_URL must use PostgreSQL")
fi
if [[ ! "${REDIS_URL:-}" =~ ^rediss?:// ]]; then
  failures+=("REDIS_URL must use redis:// or rediss://")
fi
if [[ "${FRONTEND_URL:-}" != https://* || "${PUBLIC_API_URL:-}" != https://* ]]; then
  failures+=("FRONTEND_URL and PUBLIC_API_URL must use HTTPS")
fi
if [[ "${CORS_ORIGINS:-}" =~ localhost|127\.0\.0\.1 ]]; then
  failures+=("CORS_ORIGINS must not contain localhost")
fi

if [ "${STORAGE_DRIVER:-local}" = "s3" ]; then
  for key in S3_BUCKET S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_PUBLIC_BASE_URL; do
    if [ -z "${!key:-}" ]; then
      failures+=("$key is required for S3 storage")
    fi
  done
fi

for command in node npm curl pg_dump pg_restore psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    failures+=("$command is not installed")
  fi
done

if [ "${#failures[@]}" -gt 0 ]; then
  printf 'Preflight failed:\n' >&2
  printf ' - %s\n' "${failures[@]}" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root/backend"
npx prisma validate
npx prisma migrate status
pg_dump --schema-only --no-owner --no-acl "$DATABASE_URL" >/dev/null

if ! command -v redis-cli >/dev/null 2>&1; then
  echo "Preflight failed: redis-cli is not installed" >&2
  exit 1
fi
redis-cli -u "$REDIS_URL" --no-auth-warning ping | grep -q '^PONG$'

curl --fail --silent --show-error --max-time 10 "$FRONTEND_URL" >/dev/null
echo "Staging preflight passed for database, Redis, migrations and frontend."
