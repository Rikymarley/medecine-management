#!/usr/bin/env sh
set -e

echo "Preparing Laravel caches..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Running database migrations..."
php artisan migrate --force

echo "Starting Apache..."
exec apache2-foreground
