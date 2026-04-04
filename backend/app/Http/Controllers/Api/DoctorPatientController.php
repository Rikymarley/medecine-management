<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DoctorPatientController extends Controller
{
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
        $rows = User::query()
            ->where('role', 'patient')
            ->where('created_by_doctor_id', $request->user()->id)
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

        if ($this->hasDuplicate($request->user()->id, $data['name'], $data['phone'] ?? null, $data['ninu'] ?? null)) {
            return response()->json([
                'message' => 'Ce patient existe deja pour ce medecin. Utilisez la fiche existante.'
            ], 422);
        }

        $placeholderEmail = 'patient+' . Str::uuid()->toString() . '@retel.local';

        $row = User::create([
            'name' => trim($data['name']),
            'email' => $placeholderEmail,
            'phone' => $this->normalizedPhone($data['phone'] ?? null),
            'ninu' => trim((string) ($data['ninu'] ?? '')) ?: null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'address' => $data['address'] ?? null,
            'age' => $data['age'] ?? null,
            'gender' => $data['gender'] ?? null,
            'emergency_notes' => $data['notes'] ?? null,
            'password' => Hash::make(Str::random(32)),
            'role' => 'patient',
            'account_status' => 'active',
            'created_by_doctor_id' => $request->user()->id,
            'verification_status' => 'approved',
            'verified_at' => now(),
        ]);

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
        ], 201);
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
