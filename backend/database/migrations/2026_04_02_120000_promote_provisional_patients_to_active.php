<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'patient')
            ->where('account_status', 'provisional')
            ->update(['account_status' => 'active']);
    }

    public function down(): void
    {
        // No-op: do not demote accounts automatically.
    }
};
