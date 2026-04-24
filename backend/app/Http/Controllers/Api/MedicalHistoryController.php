<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\MedicalHistoryEntry;
use App\Models\Prescription;
use App\Models\RehabEntry;
use App\Models\User;
use App\Models\Visit;
use App\Services\DoctorPatientAccessEvaluator;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class MedicalHistoryController extends Controller
{
    private function runWithRetry(callable $callback, int $maxAttempts = 2): mixed
    {
        $attempt = 0;
        beginning:
        try {
            return $callback();
        } catch (Throwable $exception) {
            $attempt++;
            report($exception);
            if ($attempt < $maxAttempts) {
                usleep(150000);
                goto beginning;
            }
            throw $exception;
        }
    }

    private function normalizeNullableId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'undefined' || $value === 'null') {
            return null;
        }
        if (!is_numeric($value)) {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }

    private function normalizeDateInput(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === 'undefined' || $trimmed === 'null') {
            return null;
        }
        try {
            return Carbon::parse($trimmed)->toDateString();
        } catch (Throwable $exception) {
            return $trimmed;
        }
    }

    private function normalizePayloadInputs(Request $request): void
    {
        $request->merge([
            'family_member_id' => $this->normalizeNullableId($request->input('family_member_id')),
            'prescription_id' => $this->normalizeNullableId($request->input('prescription_id')),
            'visit_id' => $this->normalizeNullableId($request->input('visit_id')),
            'started_at' => $this->normalizeDateInput($request->input('started_at')),
            'ended_at' => $this->normalizeDateInput($request->input('ended_at')),
        ]);
    }

    private function generateEntryCode(MedicalHistoryEntry $entry): string
    {
        $date = optional($entry->created_at)->format('Ymd') ?? now()->format('Ymd');
        $prefix = 'MH-' . $date . '-';

        $maxForDay = MedicalHistoryEntry::query()
            ->where('entry_code', 'like', $prefix . '%')
            ->get(['entry_code'])
            ->reduce(static function (int $carry, MedicalHistoryEntry $row) use ($prefix): int {
                $code = (string) ($row->entry_code ?? '');
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

    private function ensureEntryCode(MedicalHistoryEntry $entry): void
    {
        if (!empty($entry->entry_code)) {
            return;
        }

        // Retry a few times to avoid transient unique-key collisions under concurrent creates.
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                $entryCode = $this->generateEntryCode($entry);
                $updated = MedicalHistoryEntry::query()
                    ->where('id', $entry->id)
                    ->whereNull('entry_code')
                    ->update(['entry_code' => $entryCode]);

                if ($updated > 0) {
                    $entry->refresh();
                    return;
                }

                $entry->refresh();
                if (!empty($entry->entry_code)) {
                    return;
                }
            } catch (Throwable $exception) {
                report($exception);
                usleep(100000);
            }
        }
    }

    private function validatePayload(Request $request): array
    {
        $data = $request->validate([
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
            'prescription_id' => ['nullable', 'integer', 'exists:prescriptions,id'],
            'visit_id' => ['nullable', 'integer', 'exists:visits,id'],
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

    private function ensureVisitBelongsToPatient(?int $visitId, int $patientUserId, ?int $doctorUserId = null): bool
    {
        if (!$visitId) {
            return true;
        }

        $query = Visit::query()
            ->where('id', $visitId)
            ->where('patient_user_id', $patientUserId);

        if ($doctorUserId) {
            $query->where('doctor_user_id', $doctorUserId);
        }

        return $query->exists();
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
        return DoctorPatientAccessEvaluator::hasLink($doctorUserId, $patientUserId);
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

        return array_merge($entry->toArray(), [
            'visit_id' => $entry->visit_id,
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
                    'reference' => $rehab->reference,
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
        ]);
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

        $allowedPatientUserIds = array_values(array_unique(array_merge(
            [(int) $patient->id],
            $linkedUserIds
        )));

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
        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);

        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitBelongsToPatient($data['visit_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }

        try {
            $entry = $this->runWithRetry(function () use ($data, $patient) {
                return DB::transaction(function () use ($data, $patient) {
                    $created = MedicalHistoryEntry::query()->create(array_merge(
                        $data,
                        [
                            'patient_user_id' => $patient->id,
                            'doctor_user_id' => null,
                        ]
                    ));
                    $this->syncEntryPrescriptionLinks($created, $data['prescription_id'] ?? null);
                    return $created;
                });
            });
            $this->ensureEntryCode($entry);
        } catch (Throwable $exception) {
            return response()->json(['message' => "Impossible d'enregistrer l'historique pour le moment. Veuillez reessayer."], 422);
        }

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

        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitBelongsToPatient($data['visit_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }
        if (!$this->ensurePrescriptionBelongsToPatient($data['prescription_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        try {
            $this->runWithRetry(function () use ($entry, $data) {
                return DB::transaction(function () use ($entry, $data) {
                    $entry->update($data);
                    $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);
                    return true;
                });
            });
        } catch (Throwable $exception) {
            return response()->json(['message' => "Impossible de mettre a jour l'historique pour le moment. Veuillez reessayer."], 422);
        }

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

        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitBelongsToPatient($data['visit_id'] ?? null, $patient->id, $doctor->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        try {
            $entry = $this->runWithRetry(function () use ($data, $patient, $doctor) {
                return DB::transaction(function () use ($data, $patient, $doctor) {
                    $created = MedicalHistoryEntry::query()->create(array_merge(
                        $data,
                        [
                            'patient_user_id' => $patient->id,
                            'doctor_user_id' => $doctor->id,
                        ]
                    ));
                    $this->syncEntryPrescriptionLinks($created, $data['prescription_id'] ?? null);
                    return $created;
                });
            });
            $this->ensureEntryCode($entry);
        } catch (Throwable $exception) {
            return response()->json(['message' => "Impossible d'enregistrer l'historique pour le moment. Veuillez reessayer."], 422);
        }

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

        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);
        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitBelongsToPatient($data['visit_id'] ?? null, $patient->id, $doctor->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        try {
            $this->runWithRetry(function () use ($entry, $data, $doctor) {
                return DB::transaction(function () use ($entry, $data, $doctor) {
                    $entry->update(array_merge(
                        $data,
                        [
                            'doctor_user_id' => $doctor->id,
                        ]
                    ));
                    $this->syncEntryPrescriptionLinks($entry, $data['prescription_id'] ?? null);
                    return true;
                });
            });
        } catch (Throwable $exception) {
            return response()->json(['message' => "Impossible de mettre a jour l'historique pour le moment. Veuillez reessayer."], 422);
        }

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
