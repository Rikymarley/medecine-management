<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rehab_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->unsignedTinyInteger('sessions_per_week')->nullable();
            $table->unsignedTinyInteger('duration_weeks')->nullable();
            $table->string('goals', 2000)->nullable();
            $table->string('exercise_type', 255)->nullable();
            $table->string('exercise_reps', 120)->nullable();
            $table->string('exercise_frequency', 120)->nullable();
            $table->string('exercise_notes', 2000)->nullable();
            $table->unsignedTinyInteger('pain_score')->nullable();
            $table->string('mobility_score', 120)->nullable();
            $table->string('progress_notes', 3000)->nullable();
            $table->date('follow_up_date')->nullable();
            $table->timestamps();

            $table->index(['patient_user_id', 'doctor_user_id']);
            $table->index(['patient_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rehab_entries');
    }
};

