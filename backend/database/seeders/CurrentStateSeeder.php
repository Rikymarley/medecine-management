<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

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
        $fkDependencies = [
            'users' => [
                'pharmacy_id' => 'pharmacies',
            ],
            'family_members' => [
                'patient_user_id' => 'users',
            ],
            'visits' => [
                'patient_user_id' => 'users',
                'doctor_user_id' => 'users',
                'family_member_id' => 'family_members',
            ],
            'prescriptions' => [
                'doctor_user_id' => 'users',
                'patient_user_id' => 'users',
                'family_member_id' => 'family_members',
                'visit_id' => 'visits',
            ],
            'medical_history_entries' => [
                'patient_user_id' => 'users',
                'doctor_user_id' => 'users',
                'family_member_id' => 'family_members',
                'prescription_id' => 'prescriptions',
                'visit_id' => 'visits',
            ],
            'rehab_entries' => [
                'patient_user_id' => 'users',
                'doctor_user_id' => 'users',
                'prescription_id' => 'prescriptions',
                'medical_history_entry_id' => 'medical_history_entries',
                'visit_id' => 'visits',
            ],
            'medicine_requests' => [
                'prescription_id' => 'prescriptions',
            ],
            'pharmacy_responses' => [
                'pharmacy_id' => 'pharmacies',
                'prescription_id' => 'prescriptions',
                'medicine_request_id' => 'medicine_requests',
            ],
            'patient_medicine_purchases' => [
                'patient_user_id' => 'users',
                'prescription_id' => 'prescriptions',
                'medicine_request_id' => 'medicine_requests',
                'pharmacy_id' => 'pharmacies',
            ],
            'prescription_status_logs' => [
                'prescription_id' => 'prescriptions',
                'changed_by_user_id' => 'users',
            ],
            'doctor_patient_access_requests' => [
                'patient_user_id' => 'users',
                'doctor_user_id' => 'users',
            ],
            'medical_history_prescriptions' => [
                'medical_history_entry_id' => 'medical_history_entries',
                'prescription_id' => 'prescriptions',
            ],
            'emergency_contacts' => [
                'patient_user_id' => 'users',
            ],
            'doctor_specialties' => [
                'created_by_user_id' => 'users',
                'approved_by_user_id' => 'users',
            ],
        ];
        $parentIdCache = [];
        $payload = $this->sanitizePayloadByDependencies($payload, $insertOrder, $fkDependencies);

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

                if (isset($fkDependencies[$table])) {
                    $rows = array_values(array_filter($rows, function (array $row) use ($fkDependencies, $table, &$parentIdCache): bool {
                        foreach ($fkDependencies[$table] as $fkColumn => $parentTable) {
                            if (!array_key_exists($fkColumn, $row) || $row[$fkColumn] === null) {
                                continue;
                            }

                            if (!isset($parentIdCache[$parentTable])) {
                                $parentIdCache[$parentTable] = array_flip(
                                    array_map('intval', DB::table($parentTable)->pluck('id')->all())
                                );
                            }

                            $fkValue = (int) $row[$fkColumn];
                            if (!isset($parentIdCache[$parentTable][$fkValue])) {
                                return false;
                            }
                        }
                        return true;
                    }));
                }

                if (empty($rows)) {
                    continue;
                }

                foreach (array_chunk($rows, 200) as $chunk) {
                    try {
                        DB::table($table)->insert($chunk);
                    } catch (Throwable $e) {
                        foreach ($chunk as $row) {
                            try {
                                DB::table($table)->insert($row);
                            } catch (Throwable) {
                                // Skip invalid rows (for example unresolved FK references)
                                // so one bad row does not block the whole deployment.
                            }
                        }
                    }
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

    /**
     * Remove rows with broken FK references directly in the snapshot payload
     * before any database insert, so inconsistent snapshots cannot crash deploy.
     */
    private function sanitizePayloadByDependencies(array $payload, array $insertOrder, array $fkDependencies): array
    {
        $payloadIdSets = [];
        foreach ($insertOrder as $table) {
            $payloadIdSets[$table] = array_flip(array_map(
                'intval',
                array_column($payload[$table] ?? [], 'id')
            ));
        }

        $changed = true;
        while ($changed) {
            $changed = false;

            foreach ($insertOrder as $table) {
                if (!isset($fkDependencies[$table]) || empty($payload[$table])) {
                    continue;
                }

                $rows = $payload[$table];
                $filteredRows = array_values(array_filter($rows, function (array $row) use ($fkDependencies, $table, $payloadIdSets): bool {
                    foreach ($fkDependencies[$table] as $fkColumn => $parentTable) {
                        if (!array_key_exists($fkColumn, $row) || $row[$fkColumn] === null) {
                            continue;
                        }

                        $fkValue = (int) $row[$fkColumn];
                        if (!isset($payloadIdSets[$parentTable][$fkValue])) {
                            return false;
                        }
                    }

                    return true;
                }));

                if (count($filteredRows) !== count($rows)) {
                    $payload[$table] = $filteredRows;
                    $payloadIdSets[$table] = array_flip(array_map(
                        'intval',
                        array_column($filteredRows, 'id')
                    ));
                    $changed = true;
                }
            }
        }

        return $payload;
    }
}
