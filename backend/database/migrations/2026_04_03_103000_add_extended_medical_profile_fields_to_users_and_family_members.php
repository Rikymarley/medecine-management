<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('weight_kg', 5, 2)->nullable()->after('emergency_notes');
            $table->decimal('height_cm', 5, 2)->nullable()->after('weight_kg');
            $table->text('surgical_history')->nullable()->after('height_cm');
            $table->boolean('vaccination_up_to_date')->nullable()->after('surgical_history');
        });

        Schema::table('family_members', function (Blueprint $table) {
            $table->decimal('weight_kg', 5, 2)->nullable()->after('emergency_notes');
            $table->decimal('height_cm', 5, 2)->nullable()->after('weight_kg');
            $table->text('surgical_history')->nullable()->after('height_cm');
            $table->boolean('vaccination_up_to_date')->nullable()->after('surgical_history');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'weight_kg',
                'height_cm',
                'surgical_history',
                'vaccination_up_to_date',
            ]);
        });

        Schema::table('family_members', function (Blueprint $table) {
            $table->dropColumn([
                'weight_kg',
                'height_cm',
                'surgical_history',
                'vaccination_up_to_date',
            ]);
        });
    }
};

