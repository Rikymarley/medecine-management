<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 14)->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('open_now')->default(false);
            $table->string('opening_hours')->nullable();
            $table->string('closes_at', 5)->nullable();
            $table->boolean('temporary_closed')->default(false);
            $table->boolean('emergency_available')->default(false);
            $table->timestamp('last_status_updated_at')->nullable();
            $table->string('services')->nullable();
            $table->string('payment_methods')->nullable();
            $table->enum('price_range', ['low', 'medium', 'high'])->nullable();
            $table->unsignedInteger('average_wait_time')->nullable();
            $table->boolean('delivery_available')->default(false);
            $table->decimal('delivery_radius_km', 8, 2)->nullable();
            $table->boolean('night_service')->default(false);
            $table->string('license_number')->nullable();
            $table->boolean('license_verified')->default(false);
            $table->timestamp('license_verified_at')->nullable();
            $table->foreignId('license_verified_by_doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('license_verification_notes')->nullable();
            $table->string('account_verification_status')->default('approved');
            $table->string('logo_url')->nullable();
            $table->string('storefront_image_url')->nullable();
            $table->string('notes_for_patients')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratories');
    }
};

