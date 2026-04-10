<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table) {
            $table->text('opening_hours')->nullable()->after('open_now');
            $table->string('closes_at', 10)->nullable()->after('opening_hours');
            $table->boolean('temporary_closed')->default(false)->after('closes_at');
            $table->boolean('emergency_available')->default(false)->after('temporary_closed');
            $table->timestamp('last_status_updated_at')->nullable()->after('emergency_available');
        });
    }

    public function down(): void
    {
        Schema::table('pharmacies', function (Blueprint $table) {
            $table->dropColumn([
                'opening_hours',
                'closes_at',
                'temporary_closed',
                'emergency_available',
                'last_status_updated_at',
            ]);
        });
    }
};
