<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_patient_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('blocked_at')->nullable();
            $table->timestamps();
            $table->unique(['patient_user_id', 'doctor_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_patient_blocks');
    }
};
