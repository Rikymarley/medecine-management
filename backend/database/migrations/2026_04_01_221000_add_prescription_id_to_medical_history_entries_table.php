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
        Schema::table('medical_history_entries', function (Blueprint $table) {
            $table->foreignId('prescription_id')
                ->nullable()
                ->after('doctor_user_id')
                ->constrained('prescriptions')
                ->nullOnDelete();
            $table->index(['patient_user_id', 'prescription_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_history_entries', function (Blueprint $table) {
            $table->dropIndex(['patient_user_id', 'prescription_id']);
            $table->dropConstrainedForeignId('prescription_id');
        });
    }
};
