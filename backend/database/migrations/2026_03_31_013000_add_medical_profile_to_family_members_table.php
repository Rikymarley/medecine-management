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
        Schema::table('family_members', function (Blueprint $table) {
            $table->string('allergies')->nullable()->after('relationship');
            $table->string('chronic_diseases')->nullable()->after('allergies');
            $table->string('blood_type')->nullable()->after('chronic_diseases');
            $table->text('emergency_notes')->nullable()->after('blood_type');
            $table->boolean('primary_caregiver')->default(false)->after('emergency_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            $table->dropColumn([
                'allergies',
                'chronic_diseases',
                'blood_type',
                'emergency_notes',
                'primary_caregiver',
            ]);
        });
    }
};
