<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'principal_patient_id')) {
                $table->foreignId('principal_patient_id')
                    ->nullable()
                    ->after('created_by_doctor_id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index(['role', 'principal_patient_id'], 'users_role_principal_patient_idx');
            }
        });

        DB::transaction(function () {
            DB::table('users')
                ->where('role', 'patient')
                ->whereNull('principal_patient_id')
                ->orderBy('id')
                ->chunkById(500, function ($rows) {
                    foreach ($rows as $row) {
                        DB::table('users')
                            ->where('id', $row->id)
                            ->update(['principal_patient_id' => $row->id]);
                    }
                });

            $links = DB::table('family_members')
                ->select(['patient_user_id', 'linked_user_id'])
                ->whereNotNull('linked_user_id')
                ->get();

            foreach ($links as $link) {
                $principalId = (int) (DB::table('users')
                    ->where('id', $link->patient_user_id)
                    ->value('principal_patient_id') ?? $link->patient_user_id);

                DB::table('users')
                    ->where('id', $link->linked_user_id)
                    ->where('role', 'patient')
                    ->update(['principal_patient_id' => $principalId]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'principal_patient_id')) {
                $table->dropIndex('users_role_principal_patient_idx');
                $table->dropConstrainedForeignId('principal_patient_id');
            }
        });
    }
};

