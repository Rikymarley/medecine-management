<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_member_id')->nullable()->constrained('family_members')->nullOnDelete();
            $table->foreignId('patient_medicine_purchase_id')
                ->nullable()
                ->constrained('patient_medicine_purchases')
                ->cascadeOnDelete();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medicine_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pharmacy_id')->nullable()->constrained('pharmacies')->nullOnDelete();

            $table->string('medication_name');
            $table->string('form')->nullable();
            $table->string('dosage_strength')->nullable();
            $table->unsignedTinyInteger('daily_dosage')->nullable();
            $table->unsignedInteger('quantity')->default(1);

            $table->date('expiration_date')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('manufacturer')->nullable();
            $table->boolean('requires_refrigeration')->default(false);
            $table->text('note')->nullable();

            $table->timestamps();

            $table->unique('patient_medicine_purchase_id', 'cabinet_items_purchase_unique');
            $table->index(['patient_user_id', 'family_member_id'], 'cabinet_items_patient_family_index');
            $table->index(['patient_user_id', 'updated_at'], 'cabinet_items_patient_updated_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_medicine_cabinet_items');
    }
};
