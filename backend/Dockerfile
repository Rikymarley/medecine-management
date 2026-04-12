FROM php:8.3-apache

# System packages and PHP extensions needed by Laravel
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    && docker-php-ext-install \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy project files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Laravel writable dirs
RUN chown -R www-data:www-data storage bootstrap/cache

# Serve Laravel from public/
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' \
    /etc/apache2/sites-available/000-default.conf \
    /etc/apache2/apache2.conf

# Startup script (cache + migrations + apache)
RUN chmod +x /var/www/html/start.sh
CMD ["/var/www/html/start.sh"]
