<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrentStateSeeder extends Seeder
{
    public function run(): void
    {
        $snapshotPath = database_path('seeders/data/current_state.json');
        if (!file_exists($snapshotPath)) {
            throw new \RuntimeException('Snapshot seed file not found: '.$snapshotPath);
        }

        $payload = json_decode((string) file_get_contents($snapshotPath), true, 512, JSON_THROW_ON_ERROR);

        $insertOrder = [
            'users',
            'pharmacies',
            'family_members',
            'visits',
            'prescriptions',
            'medical_history_entries',
            'rehab_entries',
            'medicine_requests',
            'pharmacy_responses',
            'patient_medicine_purchases',
            'prescription_status_logs',
            'doctor_patient_access_requests',
            'medical_history_prescriptions',
            'emergency_contacts',
            'doctor_specialties',
            'medicines',
        ];

        $deleteOrder = array_reverse($insertOrder);

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        }

        try {
            foreach ($deleteOrder as $table) {
                DB::table($table)->delete();
            }

            foreach ($insertOrder as $table) {
                $rows = $payload[$table] ?? [];
                if (empty($rows)) {
                    continue;
                }

                foreach (array_chunk($rows, 200) as $chunk) {
                    DB::table($table)->insert($chunk);
                }
            }
        } finally {
            if (DB::getDriverName() === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON');
            } else {
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            }
        }
    }
}

