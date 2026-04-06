<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private function generateToken(): string
    {
        do {
            $token = strtoupper(Str::random(12));
        } while (DB::table('users')->where('claim_token', $token)->exists() || DB::table('family_members')->where('claim_token', $token)->exists());

        return $token;
    }

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'claim_token')) {
                $table->string('claim_token', 24)->nullable()->unique()->after('id_document_url');
            }
            if (!Schema::hasColumn('users', 'claim_token_expires_at')) {
                $table->timestamp('claim_token_expires_at')->nullable()->after('claim_token');
            }
            if (!Schema::hasColumn('users', 'claimed_at')) {
                $table->timestamp('claimed_at')->nullable()->after('claim_token_expires_at');
            }
        });

        $rows = DB::table('users')
            ->select('id', 'email', 'claim_token', 'claimed_at')
            ->where('role', 'patient')
            ->whereNotNull('created_by_doctor_id')
            ->get();

        foreach ($rows as $row) {
            if (!empty($row->claim_token) || !empty($row->claimed_at)) {
                continue;
            }

            $email = strtolower((string) ($row->email ?? ''));
            $isPlaceholder = str_ends_with($email, '@retel.local') || str_ends_with($email, '@family.local');

            DB::table('users')
                ->where('id', $row->id)
                ->update(
                    $isPlaceholder
                        ? [
                            'claim_token' => $this->generateToken(),
                            'claim_token_expires_at' => now()->addMonths(12),
                        ]
                        : [
                            'claimed_at' => now(),
                        ]
                );
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'claimed_at')) {
                $table->dropColumn('claimed_at');
            }
            if (Schema::hasColumn('users', 'claim_token_expires_at')) {
                $table->dropColumn('claim_token_expires_at');
            }
            if (Schema::hasColumn('users', 'claim_token')) {
                $table->dropUnique('users_claim_token_unique');
                $table->dropColumn('claim_token');
            }
        });
    }
};

