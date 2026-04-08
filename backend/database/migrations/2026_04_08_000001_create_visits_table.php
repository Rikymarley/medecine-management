<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_member_id')->nullable()->constrained('family_members')->nullOnDelete();
            $table->timestamp('visit_date');
            $table->string('visit_type')->nullable();
            $table->text('chief_complaint')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->text('treatment_plan')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
            $table->index(['patient_user_id', 'doctor_user_id']);
            $table->index('visit_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
