<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacies', function (Blueprint $table) {
            $table->json('opening_hours_json')->nullable()->after('opening_hours');
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->json('opening_hours_json')->nullable()->after('opening_hours');
        });

        Schema::table('laboratories', function (Blueprint $table) {
            $table->json('opening_hours_json')->nullable()->after('opening_hours');
        });
    }

    public function down(): void
    {
        Schema::table('laboratories', function (Blueprint $table) {
            $table->dropColumn('opening_hours_json');
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropColumn('opening_hours_json');
        });

        Schema::table('pharmacies', function (Blueprint $table) {
            $table->dropColumn('opening_hours_json');
        });
    }
};

