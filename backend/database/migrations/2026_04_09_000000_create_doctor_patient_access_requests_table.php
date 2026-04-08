<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_patient_access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->text('message')->nullable();
            $table->text('response_message')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->index(['patient_user_id', 'doctor_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_patient_access_requests');
    }
};
