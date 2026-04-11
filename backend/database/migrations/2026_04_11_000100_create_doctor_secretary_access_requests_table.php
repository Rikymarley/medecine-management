<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_secretary_access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('secretary_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->text('message')->nullable();
            $table->text('response_message')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['doctor_user_id', 'secretary_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_secretary_access_requests');
    }
};

