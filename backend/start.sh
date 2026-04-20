#!/usr/bin/env sh
set -e

echo "Database connection: ${DB_CONNECTION:-not-set}"
if [ -z "${DB_CONNECTION:-}" ]; then
  echo "ERROR: DB_CONNECTION is not set. Configure Render environment variables for Postgres."
  exit 1
fi

if [ "${APP_ENV:-production}" = "production" ] && [ "${DB_CONNECTION}" = "sqlite" ]; then
  echo "ERROR: DB_CONNECTION=sqlite in production. Set Render Postgres env vars before deploy."
  exit 1
fi

echo "Clearing stale caches..."
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

echo "Preparing Laravel caches..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Running database migrations..."
php artisan migrate --force --no-interaction

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "RUN_DB_SEED=true detected. Running database seeders..."
  php artisan db:seed --force --no-interaction
else
  echo "Skipping seeders (set RUN_DB_SEED=true to enable on next deploy)."
fi

echo "Ensuring public storage symlink..."
php artisan storage:link || true

echo "Starting Apache..."
exec apache2-foreground
