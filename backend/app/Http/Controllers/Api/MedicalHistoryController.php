<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\MedicalHistoryEntry;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MedicalHistoryController extends Controller
{
    private function generateEntryCode(): string
    {
        do {
            $code = 'MH-' . strtoupper(Str::random(8));
        } while (MedicalHistoryEntry::query()->where('entry_code', $code)->exists());

        return $code;
    }

    private function validatePayload(Request $request): array
    {
        $data = $request->validate([
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
            'prescription_id' => ['nullable', 'integer', 'exists:prescriptions,id'],
            'type' => ['required', 'in:condition,allergy,surgery,hospitalization,medication,note'],
            'title' => ['required', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:5000'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'status' => ['required', 'in:active,resolved'],
            'visibility' => ['required', 'in:doctor_only,patient_only,shared'],
        ]);

        return $data;
    }

    private function ensureFamilyMemberBelongsToPatient(?int $familyMemberId, int $patientUserId): bool
    {
        if (!$familyMemberId) {
            return true;
        }

        return FamilyMember::query()
            ->where('id', $familyMemberId)
            ->where('patient_user_id', $patientUserId)
            ->exists();
    }

    private function doctorHasPatientLink(int $doctorUserId, int $patientUserId): bool
    {
        $ownsPatient = User::query()
            ->where('id', $patientUserId)
            ->where('role', 'patient')
            ->where('created_by_doctor_id', $doctorUserId)
            ->exists();
        if ($ownsPatient) {
            return true;
        }

        return Prescription::query()
            ->where('doctor_user_id', $doctorUserId)
            ->where('patient_user_id', $patientUserId)
            ->exists();
    }

    private function listBaseQuery(int $patientUserId)
    {
        return MedicalHistoryEntry::query()
            ->where('patient_user_id', $patientUserId)
            ->with([
                'doctor:id,name',
                'familyMember:id,name',
                'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
                'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
                'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
            ])
            ->orderByDesc('started_at')
            ->orderByDesc('created_at');
    }

    private function ensurePrescriptionLinkForDoctor(
        ?int $prescriptionId,
        int $doctorUserId,
        int $patientUserId
    ): bool {
        if (!$prescriptionId) {
            return true;
        }

        return Prescription::query()
            ->where('id', $prescriptionId)
            ->where('doctor_user_id', $doctorUserId)
            ->where('patient_user_id', $patientUserId)
            ->exists();
    }

    private function ensurePrescriptionBelongsToPatient(?int $prescriptionId, int $patientUserId): bool
    {
        if (!$prescriptionId) {
            return true;
        }

        return Prescription::query()
            ->where('id', $prescriptionId)
            ->where('patient_user_id', $patientUserId)
            ->exists();
    }

    private function formatEntry(MedicalHistoryEntry $entry): array
    {
        $linked = $entry->relationLoaded('prescriptions')
            ? $entry->prescriptions
            : collect();

        if ($entry->prescription && !$linked->contains(fn ($rx) => (int) $rx->id === (int) $entry->prescription_id)) {
            $linked = $linked->push($entry->prescription);
        }

        $linkedPrescriptions = $linked
            ->unique('id')
            ->sortByDesc(fn ($rx) => optional($rx->requested_at)->getTimestamp() ?? strtotime((string) $rx->requested_at))
            ->values();
        $primaryPrescription = $linkedPrescriptions->first();

        $canEditByPatient = $entry->doctor_user_id === null;
        $linkedRehabEntries = $entry->relationLoaded('rehabEntries')
            ? $entry->rehabEntries
            : collect();

        return [
            ...$entry->toArray(),
            'doctor_name' => $entry->doctor?->name,
            'family_member_name' => $entry->familyMember?->name,
            'prescription_id' => $primaryPrescription?->id ?? $entry->prescription_id,
            'prescription_requested_at' => optional($primaryPrescription?->requested_at ?? $entry->prescription?->requested_at)->toIso8601String(),
            'prescription_print_code' => $primaryPrescription?->print_code ?? $entry->prescription?->print_code,
            'linked_prescriptions' => $linkedPrescriptions->map(fn ($rx) => [
                'id' => $rx->id,
                'print_code' => $rx->print_code,
                'requested_at' => optional($rx->requested_at)->toIso8601String(),
            ])->values(),
            'linked_rehab_entries' => $linkedRehabEntries
                ->sortByDesc(fn ($rehab) => optional($rehab->created_at)->getTimestamp() ?? strtotime((string) $rehab->created_at))
                ->map(fn ($rehab) => [
                    'id' => $rehab->id,
                    'reference' => 'REH-' . str_pad((string) $rehab->id, 6, '0', STR_PAD_LEFT),
                    'doctor_user_id' => $rehab->doctor_user_id,
                    'created_at' => optional($rehab->created_at)->toIso8601String(),
                    'sessions_per_week' => $rehab->sessions_per_week,
                    'duration_weeks' => $rehab->duration_weeks,
                    'goals' => $rehab->goals,
                    'exercise_type' => $rehab->exercise_type,
                    'exercise_reps' => $rehab->exercise_reps,
                    'exercise_frequency' => $rehab->exercise_frequency,
                    'exercise_notes' => $rehab->exercise_notes,
                    'pain_score' => $rehab->pain_score,
                    'mobility_score' => $rehab->mobility_score,
                    'progress_notes' => $rehab->progress_notes,
                    'follow_up_date' => optional($rehab->follow_up_date)->toDateString(),
                ])->values(),
            'can_edit_by_patient' => $canEditByPatient,
            'can_delete_by_patient' => $canEditByPatient,
        ];
    }

    private function syncEntryPrescriptionLinks(MedicalHistoryEntry $entry, ?int $prescriptionId): void
    {
        if ($prescriptionId) {
            $entry->prescriptions()->syncWithoutDetaching([$prescriptionId]);
            if (!$entry->prescription_id) {
                $entry->update(['prescription_id' => $prescriptionId]);
            }
            return;
        }

        if ($entry->prescription_id && !$entry->prescriptions()->where('prescription_id', $entry->prescription_id)->exists()) {
            $entry->prescriptions()->syncWithoutDetaching([$entry->prescription_id]);
        }
    }

    public function patientIndex(Request $request)
    {
        $patient = $request->user();
        $familyMemberId = $request->query('family_member_id');
        $familyMembers = FamilyMember::query()
            ->where('patient_user_id', $patient->id)
            ->get(['id', 'linked_user_id']);

        $linkedUserIds = $familyMembers
            ->pluck('linked_user_id')
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $allowedPatientUserIds = array_values(array_unique([
            (int) $patient->id,
            ...$linkedUserIds,
        ]));

        $query = MedicalHistoryEntry::query()
            ->whereIn('patient_user_id', $allowedPatientUserIds)
            ->with([
                'doctor:id,name',
                'familyMember:id,name',
                'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
                'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
                'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
            ])
            ->orderByDesc('started_at')
            ->orderByDesc('created_at');

        if ($familyMemberId !== null && $familyMemberId !== '') {
            $selectedFamilyMemberId = (int) $familyMemberId;
            $selectedMember = $familyMembers->firstWhere('id', $selectedFamilyMemberId);
            $linkedUserId = $selectedMember?->linked_user_id ? (int) $selectedMember->linked_user_id : null;

            $query->where(function ($q) use ($selectedFamilyMemberId, $linkedUserId) {
                $q->where('family_member_id', $selectedFamilyMemberId);
                if ($linkedUserId) {
                    $q->orWhere('patient_user_id', $linkedUserId);
                }
            });
        } else {
            $query->where('patient_user_id', $patient->id)
                ->whereNull('family_member_id');
        }

        return response()->json(
            $query->get()->map(function (MedicalHistoryEntry $entry) use ($patient) {
                $formatted = $this->formatEntry($entry);
                $isOwner = (int) $entry->patient_user_id === (int) $patient->id;
                if (!$isOwner) {
                    $formatted['can_edit_by_patient'] = false;
                    $formatted['can_delete_by_patient'] = false;
                }
                return $formatted;
            })->values()
        );
    }

    public function patientStore(Request $request)
    {
        $patient = $request->user();
        $data = $this->validatePayload($request);

        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }

        $entry = MedicalHistoryEntry::create([
            ...$data,
            'entry_code' => $this->generateEntryCode(),
            'patient_user_id' => $patient->id,
            'doctor_user_id' => null,
        ])->load(['doctor:id,name', 'familyMember:id,name', 'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code', 'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at']);
        $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);

        return response()->json($this->formatEntry($entry->fresh(['doctor:id,name', 'familyMember:id,name', 'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code', 'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code', 'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at'])), 201);
    }

    public function patientUpdate(Request $request, MedicalHistoryEntry $entry)
    {
        $patient = $request->user();
        if ((int) $entry->patient_user_id !== (int) $patient->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ($entry->doctor_user_id) {
            return response()->json(['message' => 'Cette entree est geree par un docteur.'], 403);
        }

        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }
        if (!$this->ensurePrescriptionBelongsToPatient($data['prescription_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $entry->update($data);
        $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);

        return response()->json($this->formatEntry($entry->fresh([
            'doctor:id,name',
            'familyMember:id,name',
            'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
        ])));
    }

    public function patientDestroy(Request $request, MedicalHistoryEntry $entry)
    {
        $patient = $request->user();
        if ((int) $entry->patient_user_id !== (int) $patient->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ($entry->doctor_user_id) {
            return response()->json(['message' => 'Cette entree est geree par un docteur.'], 403);
        }

        $entry->delete();

        return response()->json(['message' => 'Historique supprime.']);
    }

    public function doctorIndex(Request $request, User $patient)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $familyMemberId = $request->query('family_member_id');

        $query = $this->listBaseQuery($patient->id)
            ->where('visibility', '!=', 'patient_only')
            ->where(function ($q) use ($doctor) {
                $q->where('visibility', '!=', 'doctor_only')
                    ->orWhere('doctor_user_id', $doctor->id);
            });

        if ($familyMemberId !== null && $familyMemberId !== '') {
            $query->where('family_member_id', (int) $familyMemberId);
        }

        return response()->json(
            $query->get()->map(fn (MedicalHistoryEntry $entry) => $this->formatEntry($entry))->values()
        );
    }

    public function doctorStore(Request $request, User $patient)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $entry = MedicalHistoryEntry::create([
            ...$data,
            'entry_code' => $this->generateEntryCode(),
            'patient_user_id' => $patient->id,
            'doctor_user_id' => $doctor->id,
        ])->load(['doctor:id,name', 'familyMember:id,name', 'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code', 'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at']);
        $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);

        return response()->json($this->formatEntry($entry->fresh([
            'doctor:id,name',
            'familyMember:id,name',
            'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
        ])), 201);
    }

    public function doctorUpdate(Request $request, User $patient, MedicalHistoryEntry $entry)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ((int) $entry->patient_user_id !== (int) $patient->id) {
            return response()->json(['message' => 'Entree invalide.'], 422);
        }
        if ($entry->visibility === 'doctor_only' && (int) $entry->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit a cette entree doctor_only.'], 403);
        }

        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $entry->update([
            ...$data,
            'doctor_user_id' => $doctor->id,
        ]);
        $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);

        return response()->json($this->formatEntry($entry->fresh([
            'doctor:id,name',
            'familyMember:id,name',
            'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
        ])));
    }

    public function doctorLinkPrescription(Request $request, User $patient, MedicalHistoryEntry $entry)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ((int) $entry->patient_user_id !== (int) $patient->id) {
            return response()->json(['message' => 'Entree invalide.'], 422);
        }
        if ($entry->visibility === 'doctor_only' && (int) $entry->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit a cette entree doctor_only.'], 403);
        }

        $data = $request->validate([
            'prescription_id' => ['required', 'integer', 'exists:prescriptions,id'],
        ]);

        if (!$this->ensurePrescriptionLinkForDoctor((int) $data['prescription_id'], $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $prescriptionId = (int) $data['prescription_id'];
        $entry->prescriptions()->syncWithoutDetaching([$prescriptionId]);
        if (!$entry->prescription_id) {
            $entry->update(['prescription_id' => $prescriptionId]);
        } else {
            $entry->update(['doctor_user_id' => $doctor->id]);
        }

        return response()->json($this->formatEntry($entry->fresh([
            'doctor:id,name',
            'familyMember:id,name',
            'prescription:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'prescriptions:id,patient_user_id,doctor_user_id,patient_name,requested_at,print_code',
            'rehabEntries:id,medical_history_entry_id,doctor_user_id,sessions_per_week,duration_weeks,goals,exercise_type,exercise_reps,exercise_frequency,exercise_notes,pain_score,mobility_score,progress_notes,follow_up_date,created_at',
        ])));
    }
}
