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
            $table->string('source', 20)->default('app')->after('doctor_name');
            $table->string('patient_phone')->nullable()->after('patient_name');
            $table->string('claim_token', 120)->nullable()->after('patient_phone');
            $table->timestamp('claim_expires_at')->nullable()->after('claim_token');
            $table->string('qr_token', 120)->nullable()->after('status');
            $table->string('print_code', 24)->nullable()->unique()->after('qr_token');
            $table->timestamp('printed_at')->nullable()->after('print_code');
            $table->unsignedInteger('print_count')->default(0)->after('printed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropUnique(['print_code']);
            $table->dropColumn([
                'source',
                'patient_phone',
                'claim_token',
                'claim_expires_at',
                'qr_token',
                'print_code',
                'printed_at',
                'print_count',
            ]);
        });
    }
};
