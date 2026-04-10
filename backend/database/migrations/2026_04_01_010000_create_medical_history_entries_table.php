<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_member_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('doctor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40);
            $table->string('title', 255);
            $table->text('details')->nullable();
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();
            $table->string('status', 20)->default('active');
            $table->string('visibility', 20)->default('shared');
            $table->timestamps();

            $table->index(['patient_user_id', 'family_member_id']);
            $table->index(['patient_user_id', 'type']);
            $table->index(['patient_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_entries');
    }
};
