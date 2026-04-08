<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rehab_entries', function (Blueprint $table) {
            $table->foreignId('visit_id')->nullable()->after('prescription_id')->constrained('visits')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rehab_entries', function (Blueprint $table) {
            $table->dropForeign(['visit_id']);
            $table->dropColumn('visit_id');
        });
    }
};
