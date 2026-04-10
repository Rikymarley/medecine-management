<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            return;
        }

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();

            // Core account and role fields
            $table->string('role')->default('patient');
            $table->unsignedBigInteger('pharmacy_id')->nullable();
            $table->string('verification_status')->default('approved');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('verification_notes')->nullable();
            $table->string('account_status')->default('active');
            $table->foreignId('created_by_doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('principal_patient_id')->nullable()->constrained('users')->nullOnDelete();

            // Contact and profile
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('recovery_whatsapp', 14)->nullable();
            $table->string('profile_photo_url')->nullable();
            $table->string('profile_banner_url')->nullable();
            $table->string('id_document_url')->nullable();

            // Doctor fields
            $table->string('specialty')->nullable();
            $table->string('city')->nullable();
            $table->string('department')->nullable();
            $table->string('languages')->nullable();
            $table->boolean('teleconsultation_available')->default(false);
            $table->text('consultation_hours')->nullable();
            $table->string('license_number')->nullable();
            $table->boolean('license_verified')->default(false);
            $table->boolean('can_verify_accounts')->default(false);
            $table->timestamp('license_verified_at')->nullable();
            $table->foreignId('license_verified_by_doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('license_verification_notes')->nullable();
            $table->integer('years_experience')->nullable();
            $table->string('consultation_fee_range')->nullable();
            $table->text('bio')->nullable();

            // Patient medical profile
            $table->string('ninu')->nullable()->unique();
            $table->date('date_of_birth')->nullable();
            $table->integer('age')->nullable();
            $table->string('gender')->nullable();
            $table->string('allergies')->nullable();
            $table->string('chronic_diseases')->nullable();
            $table->string('blood_type')->nullable();
            $table->text('emergency_notes')->nullable();
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->decimal('height_cm', 8, 2)->nullable();
            $table->text('surgical_history')->nullable();
            $table->boolean('vaccination_up_to_date')->nullable();

            // Claim account fields
            $table->string('claim_token', 24)->nullable()->unique();
            $table->timestamp('claim_token_expires_at')->nullable();
            $table->timestamp('claimed_at')->nullable();

            // Audit / delegation fields
            $table->foreignId('blocked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('blocked_at')->nullable();
            $table->foreignId('delegated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('delegated_at')->nullable();

            $table->index(['role', 'account_status'], 'users_role_account_status_index');
            $table->index(['created_by_doctor_id', 'account_status'], 'users_created_by_doctor_id_account_status_index');
            $table->index(['role', 'principal_patient_id'], 'users_role_principal_patient_idx');
            $table->unique('pharmacy_id', 'users_pharmacy_id_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

