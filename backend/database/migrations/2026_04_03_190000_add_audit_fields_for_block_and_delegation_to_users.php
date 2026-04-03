<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'blocked_by')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('blocked_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('blocked_at')->nullable();
                $table->foreignId('delegated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('delegated_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'blocked_by')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropConstrainedForeignId('blocked_by');
                $table->dropConstrainedForeignId('delegated_by');
                $table->dropColumn(['blocked_at', 'delegated_at']);
            });
        }
    }
};
