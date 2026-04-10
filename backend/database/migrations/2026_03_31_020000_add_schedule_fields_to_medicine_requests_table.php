<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicine_requests', function (Blueprint $table) {
            $table->date('expiry_date')->nullable()->after('quantity');
            $table->unsignedSmallInteger('duration_days')->nullable()->after('expiry_date');
            $table->unsignedTinyInteger('daily_dosage')->nullable()->after('duration_days');
            $table->text('notes')->nullable()->after('daily_dosage');
        });
    }

    public function down(): void
    {
        Schema::table('medicine_requests', function (Blueprint $table) {
            $table->dropColumn(['expiry_date', 'duration_days', 'daily_dosage', 'notes']);
        });
    }
};
