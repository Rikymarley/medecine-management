<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            $table->string('account_status')->default('active')->after('account_verification_status');
            $table->boolean('can_verify_accounts')->default(false)->after('account_status');
            $table->timestamp('account_verified_at')->nullable()->after('can_verify_accounts');
            $table->foreignId('account_verified_by')->nullable()->after('account_verified_at')->constrained('users')->nullOnDelete();
            $table->text('account_verification_notes')->nullable()->after('account_verified_by');
            $table->foreignId('blocked_by')->nullable()->after('account_verification_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('blocked_at')->nullable()->after('blocked_by');
            $table->foreignId('delegated_by')->nullable()->after('blocked_at')->constrained('users')->nullOnDelete();
            $table->timestamp('delegated_at')->nullable()->after('delegated_by');
        });

        Schema::table('laboratories', function (Blueprint $table) {
            $table->string('account_status')->default('active')->after('account_verification_status');
            $table->boolean('can_verify_accounts')->default(false)->after('account_status');
            $table->timestamp('account_verified_at')->nullable()->after('can_verify_accounts');
            $table->foreignId('account_verified_by')->nullable()->after('account_verified_at')->constrained('users')->nullOnDelete();
            $table->text('account_verification_notes')->nullable()->after('account_verified_by');
            $table->foreignId('blocked_by')->nullable()->after('account_verification_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('blocked_at')->nullable()->after('blocked_by');
            $table->foreignId('delegated_by')->nullable()->after('blocked_at')->constrained('users')->nullOnDelete();
            $table->timestamp('delegated_at')->nullable()->after('delegated_by');
        });
    }

    public function down(): void
    {
        Schema::table('laboratories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delegated_by');
            $table->dropColumn('delegated_at');
            $table->dropConstrainedForeignId('blocked_by');
            $table->dropColumn('blocked_at');
            $table->dropConstrainedForeignId('account_verified_by');
            $table->dropColumn(['account_verified_at', 'account_verification_notes']);
            $table->dropColumn(['can_verify_accounts', 'account_status']);
        });

        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delegated_by');
            $table->dropColumn('delegated_at');
            $table->dropConstrainedForeignId('blocked_by');
            $table->dropColumn('blocked_at');
            $table->dropConstrainedForeignId('account_verified_by');
            $table->dropColumn(['account_verified_at', 'account_verification_notes']);
            $table->dropColumn(['can_verify_accounts', 'account_status']);
        });
    }
};

