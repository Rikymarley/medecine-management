<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\PharmacyResponse;
use App\Models\Prescription;
use App\Models\User;
use App\Models\Visit;
use App\Services\DoctorPatientAccessEvaluator;
use App\Services\PrescriptionAccessEvaluator;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PrescriptionController extends Controller
{
    private function runWithRetry(callable $callback, int $maxAttempts = 2): mixed
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

    private function isPrintCodeConflict(\Throwable $exception): bool
    {
        if ($exception instanceof QueryException) {
            $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode() ?? '');
            $message = Str::lower($exception->getMessage());
            if ($sqlState === '23505') {
                return true;
            }
            if (str_contains($message, 'print_code') && str_contains($message, 'unique')) {
                return true;
            }
        }

        $fallbackMessage = Str::lower($exception->getMessage());
        return str_contains($fallbackMessage, 'print_code') && str_contains($fallbackMessage, 'unique');
    }

    private function insertMedicineRowsWithRetry(int $prescriptionId, array $medicinePayload, int $maxAttempts = 2): void
    {
        $attempt = 0;
        $now = now();
        while ($attempt < $maxAttempts) {
            try {
                $rows = array_map(function (array $item) use ($prescriptionId, $now): array {
                    return [
                        'prescription_id' => $prescriptionId,
                        'name' => (string) $item['name'],
                        'strength' => $item['strength'] ?? null,
                        'form' => $item['form'] ?? null,
                        'quantity' => $item['quantity'] ?? 1,
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'duration_days' => $item['duration_days'] ?? null,
                        'daily_dosage' => $item['daily_dosage'] ?? null,
                        'notes' => $item['notes'] ?? null,
                        'generic_allowed' => (bool) ($item['generic_allowed'] ?? false),
                        'conversion_allowed' => (bool) ($item['conversion_allowed'] ?? false),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }, $medicinePayload);

                DB::table('medicine_requests')->where('prescription_id', $prescriptionId)->delete();
                DB::table('medicine_requests')->insert($rows);
                return;
            } catch (\Throwable $exception) {
                $attempt++;
                report($exception);
                if ($attempt >= $maxAttempts) {
                    throw $exception;
                }
                usleep(150000);
            }
        }
    }

    private function clipText(?string $value, int $max): ?string
    {
        if ($value === null) {
            return null;
        }
        return mb_substr(trim($value), 0, $max);
    }

    private function generateClaimToken(): string
    {
        do {
            $token = strtoupper(Str::random(12));
        } while (User::query()->where('claim_token', $token)->exists());

        return $token;
    }

    private function ensurePatientClaimToken(User $patient): User
    {
        if ($patient->role !== 'patient') {
            return $patient;
        }
        if (!$patient->created_by_doctor_id) {
            return $patient;
        }
        if ($patient->claimed_at || $patient->claim_token) {
            return $patient;
        }

        $patient->update([
            'claim_token' => $this->generateClaimToken(),
            'claim_token_expires_at' => now()->addMonths(12),
        ]);

        return $patient->fresh();
    }

    private function missingDoctorProfileFields(User $doctor): array
    {
        $checks = [
            'specialite' => trim((string) ($doctor->specialty ?? '')),
            'telephone' => trim((string) ($doctor->phone ?? '')),
            'whatsapp' => trim((string) ($doctor->whatsapp ?? '')),
            'adresse' => trim((string) ($doctor->address ?? '')),
            'ville' => trim((string) ($doctor->city ?? '')),
            'departement' => trim((string) ($doctor->department ?? '')),
            'langues' => trim((string) ($doctor->languages ?? '')),
            'horaires_consultation' => trim((string) ($doctor->consultation_hours ?? '')),
            'numero_licence' => trim((string) ($doctor->license_number ?? '')),
            'annees_experience' => $doctor->years_experience,
            'frais_consultation' => trim((string) ($doctor->consultation_fee_range ?? '')),
            'latitude' => trim((string) ($doctor->latitude ?? '')),
            'longitude' => trim((string) ($doctor->longitude ?? '')),
        ];

        $missing = [];
        foreach ($checks as $field => $value) {
            if ($value === null || $value === '') {
                $missing[] = $field;
            }
        }

        return $missing;
    }

    private function generateNextPrintCodeForDate(string $date): string
    {
        $prefix = 'RX-' . $date . '-';

        $maxForDay = Prescription::query()
            ->where('print_code', 'like', $prefix . '%')
            ->get(['print_code'])
            ->reduce(static function (int $carry, Prescription $row) use ($prefix): int {
                $code = (string) ($row->print_code ?? '');
                if ($code === '' || !Str::startsWith($code, $prefix)) {
                    return $carry;
                }
                $suffix = substr($code, strlen($prefix));
                $numeric = ctype_digit($suffix) ? (int) $suffix : 0;
                return max($carry, $numeric);
            }, 0);

        $next = $maxForDay + 1;

        return $prefix . str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }

    private function generatePrintCode(Prescription $prescription): string
    {
        $date = optional($prescription->requested_at ?? $prescription->created_at)->format('Ymd') ?? now()->format('Ymd');
        return $this->generateNextPrintCodeForDate($date);
    }

    private function ensurePrintArtifacts(Prescription $prescription): void
    {
        // Retry a few times to avoid transient unique-key collisions on print_code.
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $updates = [];
            if (empty($prescription->qr_token)) {
                $updates['qr_token'] = Str::random(64);
            }
            if (empty($prescription->print_code)) {
                $updates['print_code'] = $this->generatePrintCode($prescription);
            }

            if (empty($updates)) {
                return;
            }

            try {
                $updated = Prescription::query()
                    ->where('id', $prescription->id)
                    ->when(array_key_exists('print_code', $updates), fn ($q) => $q->whereNull('print_code'))
                    ->update($updates);

                if ($updated > 0) {
                    $prescription->refresh();
                    return;
                }

                $prescription->refresh();
                if (!empty($prescription->qr_token) && !empty($prescription->print_code)) {
                    return;
                }
            } catch (\Throwable $exception) {
                report($exception);
                usleep(100000);
            }
        }
    }

    private function buildQrPayload(Prescription $prescription): string
    {
        return (string) json_encode([
            't' => 'rx',
            'id' => $prescription->id,
            'code' => $prescription->print_code,
            'token' => $prescription->qr_token,
        ], JSON_UNESCAPED_SLASHES);
    }

    private function baseRelations(): array
    {
        return [
            'medicineRequests',
            'responses',
            'familyMember:id,name',
            'patient:id,name,account_status,created_by_doctor_id,ninu,date_of_birth,phone,profile_photo_url',
            'doctor:id,name,phone,address,latitude,longitude,specialty,city,department,languages,teleconsultation_available,consultation_hours,license_number,license_verified,years_experience,consultation_fee_range,whatsapp,bio,profile_photo_url,profile_banner_url',
        ];
    }

    private function expireHours(): int
    {
        return max(1, (int) env('PRESCRIPTION_EXPIRE_HOURS', 1));
    }

    private function normalizeMedicineValue(?string $value): string
    {
        $text = Str::lower(trim((string) Str::ascii($value ?? '')));
        return preg_replace('/\s+/', ' ', $text) ?? '';
    }

    private function medicineSignature(?string $name, ?string $strength, ?string $form): string
    {
        return implode('|', [
            $this->normalizeMedicineValue($name),
            $this->normalizeMedicineValue($strength),
            $this->normalizeMedicineValue($form),
        ]);
    }

    private function autoAssignRecentPharmacyApprovals(Prescription $prescription): void
    {
        $medicineRequests = $prescription->medicineRequests()
            ->get(['id', 'name', 'strength', 'form']);

        if ($medicineRequests->isEmpty()) {
            return;
        }

        $requiredSignatures = [];
        foreach ($medicineRequests as $medicineRequest) {
            $requiredSignatures[$medicineRequest->id] = $this->medicineSignature(
                $medicineRequest->name,
                $medicineRequest->strength,
                $medicineRequest->form
            );
        }

        $signatureSet = array_flip(array_values($requiredSignatures));

        $candidateResponses = PharmacyResponse::query()
            ->join('medicine_requests', 'medicine_requests.id', '=', 'pharmacy_responses.medicine_request_id')
            ->where('pharmacy_responses.expires_at', '>', now())
            ->whereIn('pharmacy_responses.status', ['very_low', 'low', 'available', 'high', 'equivalent'])
            ->orderByDesc('pharmacy_responses.responded_at')
            ->get([
                'pharmacy_responses.id',
                'pharmacy_responses.pharmacy_id',
                'pharmacy_responses.status',
                'pharmacy_responses.responded_at',
                'pharmacy_responses.expires_at',
                'medicine_requests.name as source_name',
                'medicine_requests.strength as source_strength',
                'medicine_requests.form as source_form',
            ]);

        $latestBySignatureAndPharmacy = [];
        foreach ($candidateResponses as $row) {
            $signature = $this->medicineSignature($row->source_name, $row->source_strength, $row->source_form);
            if (!isset($signatureSet[$signature])) {
                continue;
            }

            $pairKey = $signature . '|' . $row->pharmacy_id;
            if (!isset($latestBySignatureAndPharmacy[$pairKey])) {
                $latestBySignatureAndPharmacy[$pairKey] = $row;
            }
        }

        $rowsToCreate = [];
        foreach ($medicineRequests as $medicineRequest) {
            $signature = $requiredSignatures[$medicineRequest->id] ?? '';
            if ($signature === '') {
                continue;
            }

            foreach ($latestBySignatureAndPharmacy as $pairKey => $row) {
                if (!Str::startsWith($pairKey, $signature . '|')) {
                    continue;
                }

                $rowsToCreate[] = [
                    'pharmacy_id' => (int) $row->pharmacy_id,
                    'prescription_id' => $prescription->id,
                    'medicine_request_id' => $medicineRequest->id,
                    'status' => (string) $row->status,
                    'responded_at' => $row->responded_at,
                    'expires_at' => $row->expires_at,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if (!empty($rowsToCreate)) {
            PharmacyResponse::query()->insert($rowsToCreate);
        }
    }

    public function mine(Request $request)
    {
        $doctor = $request->user();

        $prescriptions = Prescription::query()
            ->where(function ($query) use ($doctor) {
                $query
                    ->where('doctor_user_id', $doctor->id)
                    ->orWhere(function ($fallback) use ($doctor) {
                        $fallback
                            ->whereNull('doctor_user_id')
                            ->where('doctor_name', $doctor->name);
                    });
            })
            ->with($this->baseRelations())
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function searchPatients(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $query = trim((string) ($data['q'] ?? ''));
        if ($query === '') {
            return response()->json([]);
        }

        $limit = (int) ($data['limit'] ?? 8);
        $normalizedQuery = mb_strtolower(Str::ascii($query));
        $compactQuery = preg_replace('/[^a-z0-9]/', '', $normalizedQuery) ?? '';

        $isFuzzyMatch = static function (string $needle, string $haystack): bool {
            if ($needle === '' || $haystack === '') {
                return false;
            }

            if (str_contains($haystack, $needle)) {
                return true;
            }

            $tokens = preg_split('/\s+/', $haystack) ?: [];
            $tokens[] = str_replace(' ', '', $haystack);

            $threshold = mb_strlen($needle) >= 5 ? 2 : 1;
            foreach ($tokens as $token) {
                $compactToken = preg_replace('/[^a-z0-9]/', '', (string) $token) ?? '';
                if ($compactToken === '') {
                    continue;
                }
                if (levenshtein($needle, $compactToken) <= $threshold) {
                    return true;
                }
            }

            return false;
        };

        $rows = User::query()
            ->where('role', 'patient')
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'ninu', 'date_of_birth', 'profile_photo_url'])
            ->filter(function (User $user) use ($query, $normalizedQuery, $compactQuery, $isFuzzyMatch) {
                $name = mb_strtolower((string) $user->name);
                $normalizedName = mb_strtolower(Str::ascii((string) $user->name));
                $phone = mb_strtolower((string) ($user->phone ?? ''));
                $ninu = mb_strtolower((string) ($user->ninu ?? ''));
                $rawQuery = mb_strtolower($query);
                $compactName = preg_replace('/[^a-z0-9]/', '', $normalizedName) ?? '';

                return str_contains($name, $rawQuery)
                    || str_contains($normalizedName, $normalizedQuery)
                    || ($compactQuery !== '' && ($isFuzzyMatch($compactQuery, $compactName) || $isFuzzyMatch($compactQuery, $normalizedName)))
                    || str_contains($phone, $rawQuery)
                    || str_contains($ninu, $rawQuery);
            })
            ->take($limit)
            ->values();

        return response()->json($rows);
    }

    public function mineForPatient(Request $request)
    {
        $patient = $request->user();
        $familyMemberId = $request->query('family_member_id');

        $query = Prescription::query()
            ->with($this->baseRelations())
            ->orderByDesc('requested_at');

        if ($familyMemberId !== null && $familyMemberId !== '') {
            $selectedFamilyMemberId = (int) $familyMemberId;
            $selectedMember = FamilyMember::query()
                ->where('id', $selectedFamilyMemberId)
                ->where('patient_user_id', $patient->id)
                ->first();

            if (!$selectedMember) {
                return response()->json([]);
            }

            $query->where(function ($q) use ($selectedFamilyMemberId, $selectedMember) {
                $q->where('family_member_id', $selectedFamilyMemberId);

                if ($selectedMember->linked_user_id) {
                    $q->orWhere('patient_user_id', (int) $selectedMember->linked_user_id);
                }
            });
        } else {
            $query->where('patient_user_id', $patient->id);
        }

        $prescriptions = $query->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function index()
    {
        $prescriptions = Prescription::query()
            ->with($this->baseRelations())
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function store(Request $request)
    {
        $normalizeNullableId = static function ($value): ?int {
            if ($value === null || $value === '' || $value === 'undefined' || $value === 'null') {
                return null;
            }
            if (!is_numeric($value)) {
                return null;
            }
            $id = (int) $value;
            return $id > 0 ? $id : null;
        };

        $request->merge([
            'visit_id' => $normalizeNullableId($request->input('visit_id')),
            'family_member_id' => $normalizeNullableId($request->input('family_member_id')),
        ]);

        $data = $request->validate([
            'patient_name' => ['required', 'string', 'max:255'],
            'patient_phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'patient_user_id' => ['required', 'integer', 'exists:users,id'],
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
            'visit_id' => ['nullable', 'integer', 'exists:visits,id'],
            'medicine_requests' => ['required', 'array', 'min:1'],
            'medicine_requests.*.name' => ['required', 'string', 'max:255'],
            'medicine_requests.*.strength' => ['nullable', 'string', 'max:50'],
            'medicine_requests.*.form' => ['nullable', 'string', 'max:50'],
            'medicine_requests.*.quantity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'medicine_requests.*.expiry_date' => ['nullable', 'date'],
            'medicine_requests.*.duration_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'medicine_requests.*.daily_dosage' => ['nullable', 'integer', 'min:1', 'max:24'],
            'medicine_requests.*.notes' => ['nullable', 'string', 'max:3000'],
            'medicine_requests.*.generic_allowed' => ['boolean'],
            'medicine_requests.*.conversion_allowed' => ['boolean'],
        ]);

        $doctor = $request->user();
        $missingFields = $this->missingDoctorProfileFields($doctor);
        if (!empty($missingFields)) {
            return response()->json([
                'message' => 'Profil medecin incomplet. Completion a 100% requise (Bio facultatif).',
                'missing_fields' => $missingFields,
            ], 422);
        }

        $patientUser = User::query()
            ->where('id', (int) $data['patient_user_id'])
            ->where('role', 'patient')
            ->first();
        if (!$patientUser) {
            return response()->json(['message' => 'Patient introuvable.'], 422);
        }

        $resolvedFamilyMemberId = null;
        if (!empty($data['family_member_id'])) {
            $familyMember = FamilyMember::query()
                ->where('id', (int) $data['family_member_id'])
                ->where('patient_user_id', $patientUser->id)
                ->first();
            if (!$familyMember) {
                return response()->json(['message' => 'Le membre de famille ne correspond pas a ce patient.'], 422);
            }
            $resolvedFamilyMemberId = $familyMember->id;
        }

        $resolvedVisitId = null;
        if (!empty($data['visit_id'])) {
            $visit = Visit::query()
                ->where('id', (int) $data['visit_id'])
                ->where('patient_user_id', $patientUser->id)
                ->where('doctor_user_id', $doctor->id)
                ->first();
            if (!$visit) {
                return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
            }
            if ($resolvedFamilyMemberId !== null && (int) ($visit->family_member_id ?? 0) !== $resolvedFamilyMemberId) {
                return response()->json(['message' => 'La visite ne correspond pas au membre de famille selectionne.'], 422);
            }
            $resolvedVisitId = $visit->id;
        }

        $resolvedPatientName = $this->clipText($patientUser->name, 255);
        $resolvedPatientPhone = $this->clipText($patientUser->phone ?? ($data['patient_phone'] ?? null), 14);

        $medicinePayload = array_map(function (array $item) {
            return [
                'name' => $this->clipText((string) ($item['name'] ?? ''), 255) ?? '',
                'strength' => $this->clipText($item['strength'] ?? null, 50),
                'form' => $this->clipText($item['form'] ?? null, 50),
                'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                'expiry_date' => $item['expiry_date'] ?? null,
                'duration_days' => $item['duration_days'] ?? null,
                'daily_dosage' => $item['daily_dosage'] ?? null,
                'notes' => $this->clipText($item['notes'] ?? null, 3000),
                'generic_allowed' => (bool) ($item['generic_allowed'] ?? false),
                'conversion_allowed' => (bool) ($item['conversion_allowed'] ?? false),
            ];
        }, $data['medicine_requests']);

        try {
            $prescription = null;
            $lastException = null;

            for ($codeAttempt = 0; $codeAttempt < 5; $codeAttempt++) {
                $requestedAt = now();
                $reservedPrintCode = $this->generateNextPrintCodeForDate($requestedAt->format('Ymd'));

                try {
                    $prescription = $this->runWithRetry(function () use (
                        $patientUser,
                        $doctor,
                        $resolvedPatientName,
                        $resolvedPatientPhone,
                        $resolvedFamilyMemberId,
                        $resolvedVisitId,
                        $reservedPrintCode,
                        $requestedAt,
                        $medicinePayload
                    ) {
                        return DB::transaction(function () use (
                            $patientUser,
                            $doctor,
                            $resolvedPatientName,
                            $resolvedPatientPhone,
                            $resolvedFamilyMemberId,
                            $resolvedVisitId,
                            $reservedPrintCode,
                            $requestedAt,
                            $medicinePayload
                        ) {
                            $created = Prescription::query()->create([
                                'patient_user_id' => $patientUser->id,
                                'doctor_user_id' => $doctor->id,
                                'patient_name' => $resolvedPatientName,
                                'patient_phone' => $resolvedPatientPhone,
                                'doctor_name' => $doctor->name,
                                'source' => 'app',
                                'family_member_id' => $resolvedFamilyMemberId,
                                'visit_id' => $resolvedVisitId,
                                'status' => 'sent_to_pharmacies',
                                'print_code' => $reservedPrintCode,
                                'qr_token' => Str::random(64),
                                'requested_at' => $requestedAt,
                            ]);

                            $created->statusLogs()->create([
                                'old_status' => null,
                                'new_status' => 'sent_to_pharmacies',
                                'changed_by_user_id' => $doctor->id,
                                'reason' => 'created',
                                'metadata' => null,
                                'changed_at' => now(),
                            ]);

                            $this->insertMedicineRowsWithRetry($created->id, $medicinePayload, 2);
                            return $created;
                        });
                    }, 2);
                    break;
                } catch (\Throwable $exception) {
                    $lastException = $exception;
                    if ($this->isPrintCodeConflict($exception)) {
                        usleep(120000);
                        continue;
                    }
                    throw $exception;
                }
            }

            if (!$prescription) {
                if ($lastException) {
                    throw $lastException;
                }
                throw new \RuntimeException('Prescription create failed without exception.');
            }

            $this->ensurePrintArtifacts($prescription);
            try {
                $this->autoAssignRecentPharmacyApprovals($prescription);
            } catch (\Throwable $exception) {
                report($exception);
            }

            $prescription->load(['medicineRequests', 'responses']);
            $prescription->refreshStatusFromResponses($this->expireHours());

            return response()->json($prescription->load($this->baseRelations()), 201);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => "Impossible de creer l'ordonnance pour le moment. Veuillez reessayer.",
            ], 422);
        }
    }

    public function show(Request $request, Prescription $prescription)
    {
        if (!PrescriptionAccessEvaluator::canAccessAsPharmacy($request->user(), $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->load($this->baseRelations());
        $prescription->refreshStatusFromResponses($this->expireHours());

        return response()->json(
            $prescription
        );
    }

    public function printDataForDoctor(Request $request, Prescription $prescription)
    {
        $doctor = $request->user();
        if ((int) $prescription->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $this->ensurePrintArtifacts($prescription);
        $prescription->increment('print_count');
        $prescription->update(['printed_at' => now()]);
        $prescription->refresh();
        $prescription->load(['medicineRequests', 'familyMember:id,name']);

        return response()->json([
            'prescription_id' => $prescription->id,
            'print_code' => $prescription->print_code,
            'qr_token' => $prescription->qr_token,
            'qr_payload' => $this->buildQrPayload($prescription),
            'qr_value' => sprintf('RX-%d-%s', $prescription->id, $prescription->print_code),
            'printed_at' => optional($prescription->printed_at)->toIso8601String(),
            'print_count' => (int) $prescription->print_count,
            'patient_name' => $prescription->patient_name,
            'patient_phone' => $prescription->patient_phone,
            'doctor_name' => $prescription->doctor_name,
            'requested_at' => optional($prescription->requested_at)->toIso8601String(),
            'family_member_name' => optional($prescription->familyMember)->name,
            'medicine_requests' => $prescription->medicineRequests->map(fn ($med) => [
                'id' => $med->id,
                'name' => $med->name,
                'strength' => $med->strength,
                'form' => $med->form,
                'quantity' => $med->quantity,
                'duration_days' => $med->duration_days,
                'daily_dosage' => $med->daily_dosage,
                'notes' => $med->notes,
            ])->values(),
        ]);
    }

    public function linkPatientByNinu(Request $request, Prescription $prescription)
    {
        $doctor = $request->user();
        if ((int) $prescription->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'ninu' => ['required', 'string', 'max:50'],
        ]);

        $patient = User::query()
            ->where('role', 'patient')
            ->where('ninu', trim($data['ninu']))
            ->first();

        if (!$patient) {
            return response()->json(['message' => 'Aucun patient trouve avec ce NINU.'], 422);
        }

        $prescription->update([
            'patient_user_id' => $patient->id,
            'patient_name' => $patient->name,
            'patient_phone' => $patient->phone,
            'source' => 'app',
        ]);

        return response()->json($prescription->fresh()->load($this->baseRelations()));
    }

    public function createAndLinkPatient(Request $request, Prescription $prescription)
    {
        $doctor = $request->user();
        if ((int) $prescription->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ($prescription->patient_user_id) {
            return response()->json($prescription->fresh()->load($this->baseRelations()));
        }

        $data = $request->validate([
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $name = trim((string) $prescription->patient_name);
        $phone = trim((string) ($prescription->patient_phone ?? ''));
        $phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
        $ninu = trim((string) ($data['ninu'] ?? ''));

        $patient = null;
        if ($ninu !== '') {
            $patient = User::query()
                ->where('role', 'patient')
                ->where('ninu', $ninu)
                ->first();
        }

        if (!$patient && $name !== '' && $phoneDigits !== '') {
            $patient = User::query()
                ->where('role', 'patient')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->get()
                ->first(function (User $candidate) use ($phoneDigits) {
                    $candidateDigits = preg_replace('/\D+/', '', (string) ($candidate->phone ?? '')) ?? '';
                    return $candidateDigits !== '' && $candidateDigits === $phoneDigits;
                });
        }

        if (!$patient) {
            $patient = User::create([
                'name' => $name !== '' ? $name : 'Patient',
                'email' => 'patient+' . Str::uuid()->toString() . '@retel.local',
                'phone' => $phone !== '' ? $phone : null,
                'ninu' => $ninu !== '' ? $ninu : null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'password' => Hash::make(Str::password(32)),
                'role' => 'patient',
                'account_status' => 'active',
                'created_by_doctor_id' => $doctor->id,
                'verification_status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $doctor->id,
                'claim_token' => $this->generateClaimToken(),
                'claim_token_expires_at' => now()->addMonths(12),
            ]);
            if (Schema::hasColumn('users', 'principal_patient_id')) {
                $patient->update(['principal_patient_id' => $patient->id]);
            }
        }

        $prescription->update([
            'patient_user_id' => $patient->id,
            'patient_name' => $patient->name,
            'patient_phone' => $patient->phone ?? $prescription->patient_phone,
            'source' => 'app',
        ]);

        return response()->json($prescription->fresh()->load($this->baseRelations()));
    }

    public function doctorPatientProfile(Request $request, User $patient)
    {
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Patient introuvable.'], 422);
        }

        $doctor = $request->user();
        $hasLink = DoctorPatientAccessEvaluator::hasLink($doctor->id, $patient->id);

        if (!$hasLink) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $patient = $this->ensurePatientClaimToken($patient);

        return response()->json([
            'id' => $patient->id,
            'name' => $patient->name,
            'profile_photo_url' => $patient->profile_photo_url,
            'phone' => $patient->phone,
            'ninu' => $patient->ninu,
            'date_of_birth' => $patient->date_of_birth,
            'whatsapp' => $patient->whatsapp,
            'address' => $patient->address,
            'age' => $patient->age,
            'gender' => $patient->gender,
            'allergies' => $patient->allergies,
            'chronic_diseases' => $patient->chronic_diseases,
            'surgical_history' => $patient->surgical_history,
            'blood_type' => $patient->blood_type,
            'emergency_notes' => $patient->emergency_notes,
            'claim_token' => $patient->claim_token,
            'claim_token_expires_at' => $patient->claim_token_expires_at,
            'claimed_at' => $patient->claimed_at,
        ]);
    }

    public function completeForPatient(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->changeStatus('completed', $request->user()->id, 'patient_completed');

        return response()->json($prescription->load($this->baseRelations()));
    }

    public function reopenForPatient(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->changeStatus('sent_to_pharmacies', $request->user()->id, 'patient_reopened');
        $prescription->load($this->baseRelations());
        $prescription->refreshStatusFromResponses($this->expireHours());

        return response()->json($prescription);
    }

    public function assignFamilyMemberForPatient(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
        ]);

        if (!empty($data['family_member_id'])) {
            $member = FamilyMember::query()->find($data['family_member_id']);
            if (!$member || (int) $member->patient_user_id !== (int) $request->user()->id) {
                return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
            }
        }

        $prescription->update(['family_member_id' => $data['family_member_id'] ?? null]);

        return response()->json($prescription->load($this->baseRelations()));
    }

    public function reactivateForPharmacy(Request $request, Prescription $prescription)
    {
        $user = $request->user();
        if (!$user || !$user->pharmacy_id) {
            return response()->json(['message' => 'Aucune pharmacie liee a ce compte.'], 422);
        }

        if ($prescription->status !== 'expired') {
            return response()->json(['message' => "Seules les ordonnances expirees peuvent etre reactivees."], 422);
        }

        $prescription->update([
            'requested_at' => now(),
        ]);
        $prescription->changeStatus('sent_to_pharmacies', $user->id, 'pharmacy_reactivated', [
            'pharmacy_id' => $user->pharmacy_id,
        ]);

        return response()->json($prescription->load($this->baseRelations()));
    }

    private function canAccessAsPatient(Request $request, Prescription $prescription): bool
    {
        return PrescriptionAccessEvaluator::canAccessAsPatient($request->user(), $prescription);
    }
}
