<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\PharmacyResponse;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PrescriptionController extends Controller
{
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

    private function generatePrintCode(): string
    {
        do {
            $code = strtoupper(Str::random(10));
        } while (Prescription::query()->where('print_code', $code)->exists());

        return $code;
    }

    private function ensurePrintArtifacts(Prescription $prescription): void
    {
        $updates = [];
        if (empty($prescription->qr_token)) {
            $updates['qr_token'] = Str::random(64);
        }
        if (empty($prescription->print_code)) {
            $updates['print_code'] = $this->generatePrintCode();
        }

        if (!empty($updates)) {
            $prescription->update($updates);
            $prescription->refresh();
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
                if (!str_starts_with($pairKey, $signature . '|')) {
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
            $query->where(function ($where) use ($patient) {
                $where
                    ->where('patient_user_id', $patient->id)
                    ->orWhere(function ($fallback) use ($patient) {
                        $fallback
                            ->whereNull('patient_user_id')
                            ->where('patient_name', $patient->name);
                    });
            });
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
        $data = $request->validate([
            'patient_name' => ['required', 'string', 'max:255'],
            'patient_phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'patient_user_id' => ['required', 'integer', 'exists:users,id'],
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
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
            'medicine_requests.*.conversion_allowed' => ['boolean']
        ]);

        $patientUser = User::query()
            ->where('id', $data['patient_user_id'])
            ->where('role', 'patient')
            ->first();

        if (!$patientUser) {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }

        if (!empty($data['family_member_id'])) {
            if ($patientUser === null) {
                return response()->json([
                    'message' => 'Vous devez selectionner un patient existant pour associer un membre de famille.'
                ], 422);
            }

            $belongsToPatient = FamilyMember::query()
                ->where('id', $data['family_member_id'])
                ->where('patient_user_id', $patientUser->id)
                ->exists();

            if (!$belongsToPatient) {
                return response()->json([
                    'message' => 'Le membre de famille ne correspond pas a ce patient.'
                ], 422);
            }
        }

        $doctor = $request->user();
        $missingFields = $this->missingDoctorProfileFields($doctor);
        if (!empty($missingFields)) {
            return response()->json([
                'message' => 'Profil medecin incomplet. Completion a 100% requise (Bio facultatif).',
                'missing_fields' => $missingFields,
            ], 422);
        }
        $resolvedPatientName = $patientUser->name;
        $resolvedPatientPhone = $patientUser->phone ?? ($data['patient_phone'] ?? null);

        $prescription = Prescription::create([
            'patient_user_id' => $patientUser->id,
            'doctor_user_id' => $doctor->id,
            'patient_name' => $resolvedPatientName,
            'patient_phone' => $resolvedPatientPhone,
            'doctor_name' => $doctor->name,
            'source' => $patientUser ? 'app' : 'paper',
            'family_member_id' => $data['family_member_id'] ?? null,
            'status' => 'sent_to_pharmacies',
            'print_code' => $this->generatePrintCode(),
            'qr_token' => Str::random(64),
        ]);
        $prescription->statusLogs()->create([
            'old_status' => null,
            'new_status' => 'sent_to_pharmacies',
            'changed_by_user_id' => $doctor->id,
            'reason' => 'created',
            'metadata' => null,
            'changed_at' => now(),
        ]);

        $medicinePayload = array_map(static function (array $item) {
            $item['quantity'] = $item['quantity'] ?? 1;
            return $item;
        }, $data['medicine_requests']);

        $prescription->medicineRequests()->createMany($medicinePayload);
        $this->autoAssignRecentPharmacyApprovals($prescription);
        $prescription->load(['medicineRequests', 'responses']);
        $prescription->refreshStatusFromResponses($this->expireHours());

        return response()->json(
            $prescription->load($this->baseRelations()),
            201
        );
    }

    public function show(Prescription $prescription)
    {
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
            return response()->json(['message' => 'Patient invalide.'], 422);
        }

        $doctor = $request->user();
        $hasLink = (int) ($patient->created_by_doctor_id ?? 0) === (int) $doctor->id || Prescription::query()
            ->where('doctor_user_id', $doctor->id)
            ->where('patient_user_id', $patient->id)
            ->exists();

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
                return response()->json(['message' => 'Membre de famille invalide.'], 422);
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
        $user = $request->user();

        if ($prescription->patient_user_id !== null) {
            return (int) $prescription->patient_user_id === (int) $user->id;
        }

        return $prescription->patient_name === $user->name;
    }
}
