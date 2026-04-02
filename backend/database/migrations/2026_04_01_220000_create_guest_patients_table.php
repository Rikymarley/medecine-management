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
        Schema::create('guest_patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->unsignedInteger('age')->nullable();
            $table->string('gender', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['doctor_user_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guest_patients');
    }
};
