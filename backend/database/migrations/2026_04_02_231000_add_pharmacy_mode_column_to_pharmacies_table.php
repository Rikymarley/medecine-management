<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('pharmacies', 'pharmacy_mode')) {
            Schema::table('pharmacies', function (Blueprint $table) {
                $table->string('pharmacy_mode')->default('quick_manual')->after('name');
            });
        }

        DB::table('pharmacies')
            ->whereNull('pharmacy_mode')
            ->update(['pharmacy_mode' => 'quick_manual']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('pharmacies', 'pharmacy_mode')) {
            Schema::table('pharmacies', function (Blueprint $table) {
                $table->dropColumn('pharmacy_mode');
            });
        }
    }
};

