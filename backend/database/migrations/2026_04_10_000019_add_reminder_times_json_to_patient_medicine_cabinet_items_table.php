<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->json('reminder_times_json')->nullable()->after('refill_reminder_days');
        });
    }

    public function down(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->dropColumn('reminder_times_json');
        });
    }
};
