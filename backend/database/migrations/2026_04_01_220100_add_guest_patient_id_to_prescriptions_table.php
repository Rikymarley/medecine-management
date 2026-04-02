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
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->foreignId('guest_patient_id')
                ->nullable()
                ->after('patient_user_id')
                ->constrained('guest_patients')
                ->nullOnDelete();
            $table->index(['guest_patient_id', 'requested_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropIndex(['guest_patient_id', 'requested_at']);
            $table->dropConstrainedForeignId('guest_patient_id');
        });
    }
};
