<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private function generateToken(): string
    {
        do {
            $token = strtoupper(Str::random(12));
        } while (DB::table('users')->where('claim_token', $token)->exists());

        return $token;
    }

    public function up(): void
    {
        $linkedUserIds = DB::table('family_members')
            ->whereNotNull('linked_user_id')
            ->pluck('linked_user_id')
            ->filter()
            ->unique()
            ->values();

        foreach ($linkedUserIds as $userId) {
            $user = DB::table('users')
                ->select('id', 'claim_token', 'claimed_at')
                ->where('id', $userId)
                ->where('role', 'patient')
                ->first();

            if (!$user || !empty($user->claim_token) || !empty($user->claimed_at)) {
                continue;
            }

            DB::table('users')
                ->where('id', $userId)
                ->update([
                    'claim_token' => $this->generateToken(),
                    'claim_token_expires_at' => now()->addMonths(12),
                ]);
        }
    }

    public function down(): void
    {
        // no-op backfill
    }
};
