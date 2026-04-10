<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('medical_history_entry_prescriptions')) {
            return;
        }

        Schema::create('medical_history_entry_prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')->constrained('medical_history_entries')->cascadeOnDelete();
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['medical_history_entry_id', 'prescription_id'], 'mh_entry_prescriptions_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_entry_prescriptions');
    }
};
