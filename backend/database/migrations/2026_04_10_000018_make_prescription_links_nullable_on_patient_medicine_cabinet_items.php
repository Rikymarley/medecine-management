<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->foreignId('prescription_id')->nullable()->change();
            $table->foreignId('medicine_request_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patient_medicine_cabinet_items', function (Blueprint $table) {
            $table->foreignId('prescription_id')->nullable(false)->change();
            $table->foreignId('medicine_request_id')->nullable(false)->change();
        });
    }
};
