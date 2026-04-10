<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->string('source_type')->default('manual')->after('category');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->boolean('added_from_profile')->default(false)->after('source_id');
            $table->unique(
                ['patient_user_id', 'source_type', 'source_id'],
                'emergency_contacts_patient_source_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->dropUnique('emergency_contacts_patient_source_unique');
            $table->dropColumn(['source_type', 'source_id', 'added_from_profile']);
        });
    }
};
