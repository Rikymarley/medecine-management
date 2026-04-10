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
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->string('available_hours')->nullable()->after('address');
            $table->unsignedTinyInteger('priority')->nullable()->after('is_favorite');
            $table->index(['patient_user_id', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->dropIndex(['patient_user_id', 'priority']);
            $table->dropColumn(['available_hours', 'priority']);
        });
    }
};
