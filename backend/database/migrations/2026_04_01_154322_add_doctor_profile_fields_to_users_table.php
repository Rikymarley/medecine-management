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
        Schema::table('users', function (Blueprint $table) {
            $table->string('specialty')->nullable()->after('longitude');
            $table->string('city')->nullable()->after('specialty');
            $table->string('department')->nullable()->after('city');
            $table->string('languages')->nullable()->after('department');
            $table->boolean('teleconsultation_available')->default(false)->after('languages');
            $table->text('consultation_hours')->nullable()->after('teleconsultation_available');
            $table->string('license_number')->nullable()->after('consultation_hours');
            $table->boolean('license_verified')->default(false)->after('license_number');
            $table->unsignedInteger('years_experience')->nullable()->after('license_verified');
            $table->string('consultation_fee_range')->nullable()->after('years_experience');
            $table->string('whatsapp', 30)->nullable()->after('consultation_fee_range');
            $table->text('bio')->nullable()->after('whatsapp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'specialty',
                'city',
                'department',
                'languages',
                'teleconsultation_available',
                'consultation_hours',
                'license_number',
                'license_verified',
                'years_experience',
                'consultation_fee_range',
                'whatsapp',
                'bio',
            ]);
        });
    }
};
