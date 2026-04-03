<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_history_entries', function (Blueprint $table) {
            $table->string('entry_code', 20)->nullable()->unique()->after('id');
        });

        $rows = DB::table('medical_history_entries')->select('id')->whereNull('entry_code')->get();
        foreach ($rows as $row) {
            do {
                $code = 'MH-' . strtoupper(Str::random(8));
            } while (DB::table('medical_history_entries')->where('entry_code', $code)->exists());

            DB::table('medical_history_entries')
                ->where('id', $row->id)
                ->update(['entry_code' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('medical_history_entries', function (Blueprint $table) {
            $table->dropUnique(['entry_code']);
            $table->dropColumn('entry_code');
        });
    }
};
