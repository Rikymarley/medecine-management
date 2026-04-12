<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
            'pharmacies',
            'users',
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

        $driver = DB::getDriverName();
        $isPostgres = $driver === 'pgsql';

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        }

        try {
            if ($isPostgres) {
                $quotedTables = array_map(static fn (string $table): string => sprintf('"%s"', $table), $deleteOrder);
                DB::statement('TRUNCATE TABLE '.implode(', ', $quotedTables).' RESTART IDENTITY CASCADE');
            } else {
                foreach ($deleteOrder as $table) {
                    DB::table($table)->delete();
                }
            }

            foreach ($insertOrder as $table) {
                if (!Schema::hasTable($table)) {
                    continue;
                }

                $rows = $payload[$table] ?? [];
                if (empty($rows)) {
                    continue;
                }

                $allowedColumns = array_flip(Schema::getColumnListing($table));
                $rows = array_values(array_filter(array_map(
                    static function (array $row) use ($allowedColumns): array {
                        return array_intersect_key($row, $allowedColumns);
                    },
                    $rows
                ), static fn (array $row): bool => !empty($row)));

                if (empty($rows)) {
                    continue;
                }

                if ($table === 'users') {
                    $selfReferencingUserColumns = array_values(array_intersect(
                        [
                            'pharmacy_id',
                            'verified_by',
                            'blocked_by',
                            'delegated_by',
                            'created_by_doctor_id',
                            'principal_patient_id',
                        ],
                        array_keys($allowedColumns)
                    ));

                    $deferredUserUpdates = [];
                    foreach ($rows as &$row) {
                        $updatePayload = [];
                        foreach ($selfReferencingUserColumns as $column) {
                            if (array_key_exists($column, $row)) {
                                $updatePayload[$column] = $row[$column];
                                unset($row[$column]);
                            }
                        }
                        if (!empty($updatePayload) && isset($row['id'])) {
                            $deferredUserUpdates[(int) $row['id']] = $updatePayload;
                        }
                    }
                    unset($row);
                }

                foreach (array_chunk($rows, 200) as $chunk) {
                    DB::table($table)->insert($chunk);
                }

                if ($table === 'users' && !empty($deferredUserUpdates)) {
                    foreach ($deferredUserUpdates as $userId => $updateValues) {
                        DB::table('users')->where('id', $userId)->update($updateValues);
                    }
                }
            }
        } finally {
            if ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON');
            } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            }
        }
    }
}
