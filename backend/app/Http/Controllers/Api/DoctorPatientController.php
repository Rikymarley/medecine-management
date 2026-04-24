<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DoctorPatientController extends Controller
{
    private function isUsersPrimaryKeyConflict(\Throwable $exception): bool
    {
        if (!$exception instanceof QueryException) {
            return false;
        }

        $message = strtolower($exception->getMessage());
        return str_contains($message, 'users_pkey')
            || str_contains($message, 'duplicate key value violates unique constraint')
            || str_contains($message, 'key (id)=(');
    }

    private function syncUsersSequence(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $table = DB::getTablePrefix() . 'users';
        $seqRow = DB::selectOne("SELECT pg_get_serial_sequence(?, 'id') AS seq", [$table]);
        $sequence = $seqRow?->seq ?? null;
        if (!$sequence) {
            return;
        }

        DB::statement(
            "SELECT setval(?, COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)",
            [$sequence]
        );
    }

    private function runWithRetry(callable $callback, int $maxAttempts = 3): mixed
    {
        $attempt = 0;
        start:
        try {
            return $callback();
        } catch (\Throwable $exception) {
            $attempt++;
            report($exception);
            if ($attempt < $maxAttempts) {
                usleep(150000);
                goto start;
            }
            throw $exception;
        }
    }

    private function mapPatientResponse(User $row): array
    {
        return [
            'id' => $row->id,
            'doctor_user_id' => $row->created_by_doctor_id,
            'name' => $row->name,
            'phone' => $row->phone,
            'ninu' => $row->ninu,
            'date_of_birth' => $row->date_of_birth,
            'address' => $row->address,
            'age' => $row->age,
            'gender' => $row->gender,
            'notes' => $row->emergency_notes,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    private function generateClaimToken(): string
    {
        do {
            $token = strtoupper(Str::random(12));
        } while (User::query()->where('claim_token', $token)->exists());

        return $token;
    }

    private function normalizedPhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        return preg_replace('/\s+/', '', $trimmed);
    }

    private function hasDuplicate(
        int $doctorUserId,
        string $name,
        ?string $phone,
        ?string $ninu = null,
        ?int $ignoreId = null
    ): bool {
        $baseQuery = User::query()->where('role', 'patient');
        if ($ignoreId !== null) {
            $baseQuery->where('id', '!=', $ignoreId);
        }

        $trimmedNinu = $ninu !== null ? trim($ninu) : null;
        if (!empty($trimmedNinu)) {
            if ((clone $baseQuery)->where('ninu', $trimmedNinu)->exists()) {
                return true;
            }
        }

        $query = User::query()
            ->where('role', 'patient')
            ->where('created_by_doctor_id', $doctorUserId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))]);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        $normalizedPhone = $this->normalizedPhone($phone);
        if ($normalizedPhone !== null) {
            $query->whereRaw("REPLACE(phone, ' ', '') = ?", [$normalizedPhone]);
        }

        return $query->exists();
    }

    public function availability(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $name = trim((string) ($data['name'] ?? ''));
        $phone = $this->normalizedPhone($data['phone'] ?? null);
        $ninu = trim((string) ($data['ninu'] ?? ''));
        $dob = $data['date_of_birth'] ?? null;
        $limit = (int) ($data['limit'] ?? 8);

        if ($name === '' && empty($phone) && $ninu === '' && empty($dob)) {
            return response()->json([
                'available' => true,
                'count' => 0,
                'matches' => [],
            ]);
        }

        $query = User::query()
            ->where('role', 'patient')
            ->where(function ($builder) use ($name, $phone, $ninu, $dob) {
                if ($name !== '') {
                    $builder->orWhere('name', 'like', '%' . $name . '%');
                }
                if (!empty($phone)) {
                    $builder->orWhereRaw("REPLACE(phone, ' ', '') = ?", [$phone]);
                }
                if ($ninu !== '') {
                    $builder->orWhere('ninu', $ninu);
                }
                if (!empty($dob)) {
                    $builder->orWhereDate('date_of_birth', $dob);
                }
            })
            ->orderBy('name');

        $matches = $query
            ->limit($limit)
            ->get(['id', 'name', 'phone', 'ninu', 'date_of_birth', 'account_status', 'created_by_doctor_id']);

        return response()->json([
            'available' => $matches->isEmpty(),
            'count' => $matches->count(),
            'matches' => $matches,
        ]);
    }

    public function index(Request $request)
    {
        $doctorId = (int) $request->user()->id;
        $rows = User::query()
            ->where('role', 'patient')
            ->where(function ($query) use ($doctorId) {
                $query
                    ->where('created_by_doctor_id', $doctorId)
                    ->orWhereExists(function ($subQuery) use ($doctorId) {
                        $subQuery
                            ->selectRaw('1')
                            ->from('prescriptions')
                            ->whereColumn('prescriptions.patient_user_id', 'users.id')
                            ->where('prescriptions.doctor_user_id', $doctorId);
                    })
                    ->orWhereExists(function ($subQuery) use ($doctorId) {
                        $subQuery
                            ->selectRaw('1')
                            ->from('doctor_patient_access_requests')
                            ->whereColumn('doctor_patient_access_requests.patient_user_id', 'users.id')
                            ->where('doctor_patient_access_requests.doctor_user_id', $doctorId)
                            ->where('doctor_patient_access_requests.status', 'approved');
                    });
            })
            ->orderBy('name')
            ->get(['id', 'created_by_doctor_id', 'name', 'phone', 'ninu', 'date_of_birth', 'address', 'age', 'gender', 'emergency_notes', 'created_at', 'updated_at']);

        return response()->json($rows->map(fn (User $row) => [
            'id' => $row->id,
            'doctor_user_id' => $row->created_by_doctor_id,
            'name' => $row->name,
            'phone' => $row->phone,
            'ninu' => $row->ninu,
            'date_of_birth' => $row->date_of_birth,
            'address' => $row->address,
            'age' => $row->age,
            'gender' => $row->gender,
            'notes' => $row->emergency_notes,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ])->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $doctorId = (int) $request->user()->id;
        $name = trim((string) ($data['name'] ?? ''));
        $phone = $this->normalizedPhone($data['phone'] ?? null);
        $ninu = trim((string) ($data['ninu'] ?? '')) ?: null;

        if ($this->hasDuplicate($doctorId, $name, $phone, $ninu)) {
            return response()->json([
                'message' => 'Ce patient existe deja pour ce medecin. Utilisez la fiche existante.'
            ], 422);
        }

        $createRow = function () use ($data, $doctorId, $name, $phone, $ninu): User {
            return DB::transaction(function () use ($data, $doctorId, $name, $phone, $ninu) {
                $row = User::create([
                    'name' => $name,
                    'email' => 'patient+' . Str::uuid()->toString() . '@retel.local',
                    'phone' => $phone,
                    'ninu' => $ninu,
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                    'address' => $data['address'] ?? null,
                    'age' => $data['age'] ?? null,
                    'gender' => $data['gender'] ?? null,
                    'emergency_notes' => $data['notes'] ?? null,
                    'password' => Hash::make(Str::random(32)),
                    'role' => 'patient',
                    'account_status' => 'active',
                    'created_by_doctor_id' => $doctorId,
                    'verification_status' => 'approved',
                    'verified_at' => now(),
                    'verified_by' => $doctorId,
                    'claim_token' => $this->generateClaimToken(),
                    'claim_token_expires_at' => now()->addMonths(12),
                ]);

                if (Schema::hasColumn('users', 'principal_patient_id')) {
                    $row->update(['principal_patient_id' => $row->id]);
                }

                return $row->fresh();
            });
        };

        try {
            try {
                $row = $this->runWithRetry($createRow, 2);
            } catch (QueryException $exception) {
                if ($this->isUsersPrimaryKeyConflict($exception)) {
                    $this->syncUsersSequence();
                    $row = $this->runWithRetry($createRow, 2);
                } else {
                    throw $exception;
                }
            }

            return response()->json($this->mapPatientResponse($row), 201);
        } catch (QueryException $exception) {
            if ($ninu !== null && str_contains(strtolower($exception->getMessage()), 'ninu')) {
                return response()->json([
                    'message' => 'Ce NINU existe deja. Verifiez le patient avant de creer un doublon.'
                ], 422);
            }

            return response()->json([
                'message' => "Impossible de creer le patient pour le moment. Veuillez reessayer."
            ], 422);
        }
    }

    public function update(Request $request, int $patient)
    {
        $row = User::query()
            ->where('id', $patient)
            ->where('role', 'patient')
            ->where('created_by_doctor_id', $request->user()->id)
            ->first();

        if (!$row) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu,' . $row->id],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (array_key_exists('name', $data)) {
            $data['name'] = trim((string) $data['name']);
        }
        if (array_key_exists('phone', $data)) {
            $data['phone'] = $this->normalizedPhone($data['phone']);
        }
        if (array_key_exists('ninu', $data)) {
            $data['ninu'] = trim((string) $data['ninu']) ?: null;
        }

        $nextName = $data['name'] ?? $row->name;
        $nextPhone = array_key_exists('phone', $data) ? $data['phone'] : $row->phone;
        $nextNinu = array_key_exists('ninu', $data) ? $data['ninu'] : $row->ninu;
        if ($this->hasDuplicate($request->user()->id, $nextName, $nextPhone, $nextNinu, $row->id)) {
            return response()->json([
                'message' => 'Un autre patient avec ces informations existe deja.'
            ], 422);
        }

        $updatePayload = [
            'name' => $data['name'] ?? $row->name,
            'phone' => $data['phone'] ?? $row->phone,
            'ninu' => $data['ninu'] ?? $row->ninu,
            'date_of_birth' => $data['date_of_birth'] ?? $row->date_of_birth,
            'address' => $data['address'] ?? $row->address,
            'age' => $data['age'] ?? $row->age,
            'gender' => $data['gender'] ?? $row->gender,
            'emergency_notes' => $data['notes'] ?? $row->emergency_notes,
        ];

        $row->update($updatePayload);

        return response()->json([
            'id' => $row->id,
            'doctor_user_id' => $row->created_by_doctor_id,
            'name' => $row->name,
            'phone' => $row->phone,
            'ninu' => $row->ninu,
            'date_of_birth' => $row->date_of_birth,
            'address' => $row->address,
            'age' => $row->age,
            'gender' => $row->gender,
            'notes' => $row->emergency_notes,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ]);
    }
}
