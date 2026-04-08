<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')
                ->constrained('medical_history_entries')
                ->cascadeOnDelete();
            $table->foreignId('prescription_id')
                ->constrained('prescriptions')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['medical_history_entry_id', 'prescription_id'], 'mh_prescriptions_unique');
            $table->index(['prescription_id', 'medical_history_entry_id'], 'mh_prescriptions_rx_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_prescriptions');
    }
};

