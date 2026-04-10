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
            $table->unsignedInteger('age')->nullable()->after('bio');
            $table->string('gender', 10)->nullable()->after('age');
            $table->string('allergies')->nullable()->after('gender');
            $table->string('chronic_diseases')->nullable()->after('allergies');
            $table->string('blood_type', 5)->nullable()->after('chronic_diseases');
            $table->text('emergency_notes')->nullable()->after('blood_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'age',
                'gender',
                'allergies',
                'chronic_diseases',
                'blood_type',
                'emergency_notes',
            ]);
        });
    }
};
