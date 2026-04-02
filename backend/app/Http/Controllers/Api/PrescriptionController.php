<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PrescriptionController extends Controller
{
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
            'patient:id,name,account_status,created_by_doctor_id,ninu,date_of_birth,phone',
            'doctor:id,name,phone,address,latitude,longitude,specialty,city,department,languages,teleconsultation_available,consultation_hours,license_number,license_verified,years_experience,consultation_fee_range,whatsapp,bio',
        ];
    }

    private function expireHours(): int
    {
        return max(1, (int) env('PRESCRIPTION_EXPIRE_HOURS', 1));
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
        $rows = User::query()
            ->where('role', 'patient')
            ->where(function ($builder) use ($query) {
                $builder
                    ->where('name', 'like', '%' . $query . '%')
                    ->orWhere('phone', 'like', '%' . $query . '%')
                    ->orWhere('ninu', 'like', '%' . $query . '%');
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'phone', 'ninu', 'date_of_birth']);

        return response()->json($rows);
    }

    public function mineForPatient(Request $request)
    {
        $patient = $request->user();

        $prescriptions = Prescription::query()
            ->where(function ($query) use ($patient) {
                $query
                    ->where('patient_user_id', $patient->id)
                    ->orWhere(function ($fallback) use ($patient) {
                        $fallback
                            ->whereNull('patient_user_id')
                            ->where('patient_name', $patient->name);
                    });
            })
            ->with($this->baseRelations())
            ->orderByDesc('requested_at')
            ->get();
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

        if ($patientUser->account_status === 'provisional' && (int) $patientUser->created_by_doctor_id !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'Ce patient provisoire appartient a un autre medecin.'
            ], 422);
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
        $resolvedPatientName = $patientUser->name;
        $resolvedPatientPhone = $patientUser->phone ?? ($data['patient_phone'] ?? null);

        $prescription = Prescription::create([
            'patient_user_id' => $patientUser->id,
            'guest_patient_id' => null,
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
            'guest_patient_id' => null,
            'patient_name' => $patient->name,
            'patient_phone' => $patient->phone,
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
        $hasLink = Prescription::query()
            ->where('doctor_user_id', $doctor->id)
            ->where('patient_user_id', $patient->id)
            ->exists();

        if (!$hasLink) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json([
            'id' => $patient->id,
            'name' => $patient->name,
            'phone' => $patient->phone,
            'ninu' => $patient->ninu,
            'date_of_birth' => $patient->date_of_birth,
            'whatsapp' => $patient->whatsapp,
            'address' => $patient->address,
            'age' => $patient->age,
            'gender' => $patient->gender,
            'allergies' => $patient->allergies,
            'chronic_diseases' => $patient->chronic_diseases,
            'blood_type' => $patient->blood_type,
            'emergency_notes' => $patient->emergency_notes,
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

    private function canAccessAsPatient(Request $request, Prescription $prescription): bool
    {
        $user = $request->user();

        if ($prescription->patient_user_id !== null) {
            return (int) $prescription->patient_user_id === (int) $user->id;
        }

        return $prescription->patient_name === $user->name;
    }
}
