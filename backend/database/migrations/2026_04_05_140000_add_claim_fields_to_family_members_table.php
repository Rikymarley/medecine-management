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
        } while (DB::table('family_members')->where('claim_token', $token)->exists());

        return $token;
    }

    public function up(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            if (!Schema::hasColumn('family_members', 'claim_token')) {
                $table->string('claim_token', 24)->nullable()->unique()->after('id_document_url');
            }
            if (!Schema::hasColumn('family_members', 'claim_token_expires_at')) {
                $table->timestamp('claim_token_expires_at')->nullable()->after('claim_token');
            }
            if (!Schema::hasColumn('family_members', 'claimed_at')) {
                $table->timestamp('claimed_at')->nullable()->after('claim_token_expires_at');
            }
        });

        $rows = DB::table('family_members')
            ->select('id', 'claim_token')
            ->get();

        foreach ($rows as $row) {
            if (!empty($row->claim_token)) {
                continue;
            }

            DB::table('family_members')
                ->where('id', $row->id)
                ->update([
                    'claim_token' => $this->generateToken(),
                    'claim_token_expires_at' => now()->addMonths(12),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            if (Schema::hasColumn('family_members', 'claimed_at')) {
                $table->dropColumn('claimed_at');
            }
            if (Schema::hasColumn('family_members', 'claim_token_expires_at')) {
                $table->dropColumn('claim_token_expires_at');
            }
            if (Schema::hasColumn('family_members', 'claim_token')) {
                $table->dropUnique('family_members_claim_token_unique');
                $table->dropColumn('claim_token');
            }
        });
    }
};

