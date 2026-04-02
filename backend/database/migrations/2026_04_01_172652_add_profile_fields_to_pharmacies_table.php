<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table) {
            $table->text('services')->nullable()->after('reliability_score');
            $table->text('payment_methods')->nullable()->after('services');
            $table->string('price_range', 20)->nullable()->after('payment_methods');
            $table->unsignedInteger('average_wait_time')->nullable()->after('price_range');
            $table->boolean('delivery_available')->default(false)->after('average_wait_time');
            $table->decimal('delivery_radius_km', 6, 2)->nullable()->after('delivery_available');
            $table->boolean('night_service')->default(false)->after('delivery_radius_km');
            $table->string('license_number', 120)->nullable()->after('night_service');
            $table->boolean('license_verified')->default(false)->after('license_number');
            $table->string('logo_url')->nullable()->after('license_verified');
            $table->string('storefront_image_url')->nullable()->after('logo_url');
            $table->string('notes_for_patients', 500)->nullable()->after('storefront_image_url');
            $table->dateTime('last_confirmed_stock_time')->nullable()->after('notes_for_patients');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacies', function (Blueprint $table) {
            $table->dropColumn([
                'services',
                'payment_methods',
                'price_range',
                'average_wait_time',
                'delivery_available',
                'delivery_radius_km',
                'night_service',
                'license_number',
                'license_verified',
                'logo_url',
                'storefront_image_url',
                'notes_for_patients',
                'last_confirmed_stock_time',
            ]);
        });
    }
};
