<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rehab_entries', function (Blueprint $table) {
            $table->foreignId('medical_history_entry_id')
                ->nullable()
                ->after('doctor_user_id')
                ->constrained('medical_history_entries')
                ->nullOnDelete();

            $table->index(['patient_user_id', 'medical_history_entry_id'], 'rehab_patient_history_idx');
        });
    }

    public function down(): void
    {
        Schema::table('rehab_entries', function (Blueprint $table) {
            $table->dropIndex('rehab_patient_history_idx');
            $table->dropConstrainedForeignId('medical_history_entry_id');
        });
    }
};

