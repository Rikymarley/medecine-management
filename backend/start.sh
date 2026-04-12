#!/usr/bin/env sh
set -e

echo "Clearing stale caches..."
php artisan optimize:clear || true

echo "Database connection: ${DB_CONNECTION:-not-set}"
if [ "${APP_ENV}" = "production" ] && [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  echo "ERROR: DB_CONNECTION is sqlite in production. Set Render Postgres env vars before deploy."
  exit 1
fi

echo "Preparing Laravel caches..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Running database migrations..."
php artisan migrate --force

echo "Starting Apache..."
exec apache2-foreground
