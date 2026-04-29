<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorSecretaryAccessRequest;
use App\Models\PatientVitalSign;
use App\Models\User;
use App\Services\DoctorPatientAccessEvaluator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientVitalSignController extends Controller
{
    private function formatRow(PatientVitalSign $row): array
    {
        return [
            'id' => $row->id,
            'patient_user_id' => $row->patient_user_id,
            'family_member_id' => $row->family_member_id,
            'family_member_name' => $row->familyMember?->name,
            'recorded_by_user_id' => $row->recorded_by_user_id,
            'recorded_by_role' => $row->recorded_by_role,
            'recorded_by_name' => $row->recordedBy?->name,
            'recorded_at' => optional($row->recorded_at)->toIso8601String(),
            'systolic' => $row->systolic,
            'diastolic' => $row->diastolic,
            'heart_rate' => $row->heart_rate,
            'respiratory_rate' => $row->respiratory_rate,
            'temperature_c' => $row->temperature_c,
            'spo2' => $row->spo2,
            'glucose_mg_dl' => $row->glucose_mg_dl,
            'glucose_context' => $row->glucose_context,
            'weight_kg' => $row->weight_kg,
            'height_cm' => $row->height_cm,
            'pain_score' => $row->pain_score,
            'measurement_context' => $row->measurement_context,
            'note' => $row->note,
            'created_at' => optional($row->created_at)->toIso8601String(),
            'updated_at' => optional($row->updated_at)->toIso8601String(),
        ];
    }

    private function validatePayload(Request $request, int $patientUserId): array
    {
        return $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patientUserId)),
            ],
            'recorded_at' => ['required', 'date'],
            'systolic' => ['nullable', 'integer', 'min:40', 'max:280'],
            'diastolic' => ['nullable', 'integer', 'min:30', 'max:180'],
            'heart_rate' => ['nullable', 'integer', 'min:20', 'max:260'],
            'respiratory_rate' => ['nullable', 'integer', 'min:4', 'max:100'],
            'temperature_c' => ['nullable', 'numeric', 'min:25', 'max:45'],
            'spo2' => ['nullable', 'integer', 'min:40', 'max:100'],
            'glucose_mg_dl' => ['nullable', 'integer', 'min:20', 'max:900'],
            'glucose_context' => ['nullable', 'string', Rule::in(['fasting', 'post_meal', 'random'])],
            'weight_kg' => ['nullable', 'numeric', 'min:1', 'max:400'],
            'height_cm' => ['nullable', 'numeric', 'min:20', 'max:280'],
            'pain_score' => ['nullable', 'integer', 'min:0', 'max:10'],
            'measurement_context' => ['nullable', 'string', Rule::in(['rest', 'after_exercise', 'symptomatic'])],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function hasAnyReading(array $payload): bool
    {
        foreach ([
            'systolic',
            'diastolic',
            'heart_rate',
            'respiratory_rate',
            'temperature_c',
            'spo2',
            'glucose_mg_dl',
            'weight_kg',
            'height_cm',
            'pain_score',
        ] as $field) {
            if (array_key_exists($field, $payload) && $payload[$field] !== null) {
                return true;
            }
        }

        return false;
    }

    private function ensurePatient(User $patient): ?array
    {
        if ($patient->role !== 'patient') {
            return ['message' => 'Patient invalide.', 'status' => 422];
        }

        return null;
    }

    private function hasSecretaryAccess(int $secretaryId, int $patientUserId): bool
    {
        $doctorIds = DoctorSecretaryAccessRequest::query()
            ->where('secretary_user_id', $secretaryId)
            ->where('status', 'approved')
            ->pluck('doctor_user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($doctorIds->isEmpty()) {
            return false;
        }

        foreach ($doctorIds as $doctorId) {
            if (DoctorPatientAccessEvaluator::hasLink($doctorId, $patientUserId)) {
                return true;
            }
        }

        return false;
    }

    public function patientIndex(Request $request)
    {
        $patientId = (int) $request->user()->id;
        $data = $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patientId)),
            ],
        ]);

        $rows = PatientVitalSign::query()
            ->where('patient_user_id', $patientId)
            ->when($data['family_member_id'] ?? null, fn ($query, $familyId) => $query->where('family_member_id', $familyId))
            ->with(['recordedBy:id,name', 'familyMember:id,name'])
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows->map(fn (PatientVitalSign $row) => $this->formatRow($row))->values());
    }

    public function patientStore(Request $request)
    {
        $patientId = (int) $request->user()->id;
        $payload = $this->validatePayload($request, $patientId);

        if (!$this->hasAnyReading($payload)) {
            return response()->json(['message' => 'Ajoutez au moins une mesure.'], 422);
        }

        $row = PatientVitalSign::query()->create([
            ...$payload,
            'patient_user_id' => $patientId,
            'recorded_by_user_id' => $patientId,
            'recorded_by_role' => 'patient',
        ]);

        $row->load(['recordedBy:id,name', 'familyMember:id,name']);

        return response()->json([
            'message' => 'Mesure enregistree.',
            'entry' => $this->formatRow($row),
        ], 201);
    }

    public function patientDestroy(Request $request, PatientVitalSign $entry)
    {
        if ((int) $entry->patient_user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $entry->delete();

        return response()->json(['message' => 'Mesure supprimee.']);
    }

    public function doctorIndex(Request $request, User $patient)
    {
        $error = $this->ensurePatient($patient);
        if ($error) {
            return response()->json(['message' => $error['message']], $error['status']);
        }

        if (!DoctorPatientAccessEvaluator::hasLink((int) $request->user()->id, (int) $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patient->id)),
            ],
        ]);

        $rows = PatientVitalSign::query()
            ->where('patient_user_id', $patient->id)
            ->when($data['family_member_id'] ?? null, fn ($query, $familyId) => $query->where('family_member_id', $familyId))
            ->with(['recordedBy:id,name', 'familyMember:id,name'])
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows->map(fn (PatientVitalSign $row) => $this->formatRow($row))->values());
    }

    public function doctorStore(Request $request, User $patient)
    {
        $error = $this->ensurePatient($patient);
        if ($error) {
            return response()->json(['message' => $error['message']], $error['status']);
        }

        if (!DoctorPatientAccessEvaluator::hasLink((int) $request->user()->id, (int) $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $payload = $this->validatePayload($request, (int) $patient->id);
        if (!$this->hasAnyReading($payload)) {
            return response()->json(['message' => 'Ajoutez au moins une mesure.'], 422);
        }

        $row = PatientVitalSign::query()->create([
            ...$payload,
            'patient_user_id' => $patient->id,
            'recorded_by_user_id' => $request->user()->id,
            'recorded_by_role' => 'doctor',
        ]);
        $row->load(['recordedBy:id,name', 'familyMember:id,name']);

        return response()->json([
            'message' => 'Mesure enregistree.',
            'entry' => $this->formatRow($row),
        ], 201);
    }

    public function secretaryIndex(Request $request, User $patient)
    {
        $error = $this->ensurePatient($patient);
        if ($error) {
            return response()->json(['message' => $error['message']], $error['status']);
        }

        if (!$this->hasSecretaryAccess((int) $request->user()->id, (int) $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patient->id)),
            ],
        ]);

        $rows = PatientVitalSign::query()
            ->where('patient_user_id', $patient->id)
            ->when($data['family_member_id'] ?? null, fn ($query, $familyId) => $query->where('family_member_id', $familyId))
            ->with(['recordedBy:id,name', 'familyMember:id,name'])
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows->map(fn (PatientVitalSign $row) => $this->formatRow($row))->values());
    }

    public function secretaryStore(Request $request, User $patient)
    {
        $error = $this->ensurePatient($patient);
        if ($error) {
            return response()->json(['message' => $error['message']], $error['status']);
        }

        if (!$this->hasSecretaryAccess((int) $request->user()->id, (int) $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $payload = $this->validatePayload($request, (int) $patient->id);
        if (!$this->hasAnyReading($payload)) {
            return response()->json(['message' => 'Ajoutez au moins une mesure.'], 422);
        }

        $row = PatientVitalSign::query()->create([
            ...$payload,
            'patient_user_id' => $patient->id,
            'recorded_by_user_id' => $request->user()->id,
            'recorded_by_role' => 'secretaire',
        ]);
        $row->load(['recordedBy:id,name', 'familyMember:id,name']);

        return response()->json([
            'message' => 'Mesure enregistree.',
            'entry' => $this->formatRow($row),
        ], 201);
    }
}
