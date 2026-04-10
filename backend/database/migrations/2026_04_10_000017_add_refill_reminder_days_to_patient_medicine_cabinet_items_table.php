<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->unsignedSmallInteger('refill_reminder_days')->default(7)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->dropColumn('refill_reminder_days');
        });
    }
};
