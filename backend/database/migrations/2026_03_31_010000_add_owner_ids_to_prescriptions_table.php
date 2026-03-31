<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->foreignId('doctor_user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->foreignId('patient_user_id')->nullable()->after('doctor_user_id')->constrained('users')->nullOnDelete();
            $table->index(['doctor_user_id', 'requested_at']);
            $table->index(['patient_user_id', 'requested_at']);
            $table->index('status');
        });

        $prescriptions = DB::table('prescriptions')
            ->select('id', 'doctor_name', 'patient_name')
            ->get();

        foreach ($prescriptions as $prescription) {
            $doctorId = DB::table('users')
                ->where('name', $prescription->doctor_name)
                ->where('role', 'doctor')
                ->value('id');

            $patientId = DB::table('users')
                ->where('name', $prescription->patient_name)
                ->where('role', 'patient')
                ->value('id');

            DB::table('prescriptions')
                ->where('id', $prescription->id)
                ->update([
                    'doctor_user_id' => $doctorId,
                    'patient_user_id' => $patientId,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropIndex(['doctor_user_id', 'requested_at']);
            $table->dropIndex(['patient_user_id', 'requested_at']);
            $table->dropIndex(['status']);
            $table->dropConstrainedForeignId('doctor_user_id');
            $table->dropConstrainedForeignId('patient_user_id');
        });
    }
};
