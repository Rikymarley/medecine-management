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
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_status', 30)->default('active')->after('role');
            $table->foreignId('created_by_doctor_id')
                ->nullable()
                ->after('account_status')
                ->constrained('users')
                ->nullOnDelete();
            $table->index(['role', 'account_status']);
            $table->index(['created_by_doctor_id', 'account_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'account_status']);
            $table->dropIndex(['created_by_doctor_id', 'account_status']);
            $table->dropConstrainedForeignId('created_by_doctor_id');
            $table->dropColumn('account_status');
        });
    }
};
