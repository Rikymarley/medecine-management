<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\MedicalHistoryEntry;
use App\Models\Prescription;
use App\Models\RehabEntry;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\Request;

class DoctorVisitController extends Controller
{
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

    private function formatVisit(Visit $visit): array
    {
        return [
            'id' => $visit->id,
            'patient_user_id' => $visit->patient_user_id,
            'family_member_id' => $visit->family_member_id,
            'doctor_user_id' => $visit->doctor_user_id,
            'visit_date' => optional($visit->visit_date)->toIso8601String(),
            'visit_type' => $visit->visit_type,
            'chief_complaint' => $visit->chief_complaint,
            'diagnosis' => $visit->diagnosis,
            'clinical_notes' => $visit->clinical_notes,
            'treatment_plan' => $visit->treatment_plan,
            'status' => $visit->status,
            'patient_name' => $visit->patient?->name,
            'doctor_name' => $visit->doctor?->name,
            'family_member_name' => $visit->familyMember?->name,
            'linked_prescriptions_count' => $visit->prescriptions_count ?? $visit->prescriptions()->count(),
            'linked_medical_history_count' => $visit->medical_history_entries_count ?? $visit->medicalHistoryEntries()->count(),
            'linked_rehab_entries_count' => $visit->rehab_entries_count ?? $visit->rehabEntries()->count(),
            'created_at' => $visit->created_at,
            'updated_at' => $visit->updated_at,
        ];
    }

    private function formatVisitDetail(Visit $visit): array
    {
        $visit->loadMissing([
            'prescriptions' => fn ($query) => $query->select('id', 'visit_id', 'print_code', 'status', 'requested_at', 'patient_user_id', 'doctor_user_id'),
            'medicalHistoryEntries',
            'medicalHistoryEntries.doctor:id,name',
            'medicalHistoryEntries.familyMember:id,name',
            'rehabEntries',
        ]);

        $detail = $this->formatVisit($visit);
        $detail['prescriptions'] = $visit->prescriptions->map(fn (Prescription $prescription) => [
            'id' => $prescription->id,
            'print_code' => $prescription->print_code,
            'status' => $prescription->status,
            'requested_at' => optional($prescription->requested_at)->toIso8601String(),
            'patient_user_id' => $prescription->patient_user_id,
            'doctor_user_id' => $prescription->doctor_user_id,
        ])->values();

        $detail['medical_history_entries'] = $visit->medicalHistoryEntries->map(fn (MedicalHistoryEntry $entry) => [
            'id' => $entry->id,
            'entry_code' => $entry->entry_code,
            'title' => $entry->title,
            'type' => $entry->type,
            'status' => $entry->status,
            'details' => $entry->details,
            'started_at' => optional($entry->started_at)->toDateString(),
            'ended_at' => optional($entry->ended_at)->toDateString(),
            'doctor_name' => $entry->doctor?->name,
            'family_member_name' => $entry->familyMember?->name,
        ])->values();

        $detail['rehab_entries'] = $visit->rehabEntries->map(fn (RehabEntry $rehab) => [
            'id' => $rehab->id,
            'reference' => 'REH-' . str_pad((string) $rehab->id, 6, '0', STR_PAD_LEFT),
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
        ])->values();

        return $detail;
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'patient_user_id' => ['required', 'integer', 'exists:users,id'],
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
            'visit_date' => ['required', 'date'],
            'visit_type' => ['nullable', 'string', 'max:255'],
            'chief_complaint' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:5000'],
            'clinical_notes' => ['nullable', 'string', 'max:10000'],
            'treatment_plan' => ['nullable', 'string', 'max:10000'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'patient_user_id' => ['required', 'integer', 'exists:users,id'],
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
        ]);

        $familyMemberId = $request->input('family_member_id');

        if (!$this->doctorHasPatientLink($request->user()->id, $data['patient_user_id'])) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if (!$this->ensureFamilyMemberBelongsToPatient($familyMemberId ?? null, $data['patient_user_id'])) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }

        $query = Visit::query()
            ->where('patient_user_id', $data['patient_user_id'])
            ->where('doctor_user_id', $request->user()->id)
            ->when($familyMemberId, fn ($builder) => $builder->where('family_member_id', $familyMemberId))
            ->with(['doctor:id,name', 'patient:id,name', 'familyMember:id,name'])
            ->withCount(['prescriptions', 'medicalHistoryEntries', 'rehabEntries'])
            ->orderByDesc('visit_date')
            ->orderByDesc('created_at');

        $visits = $query->get();

        return response()->json($visits->map(fn (Visit $visit) => $this->formatVisit($visit)));
    }

    public function show(Request $request, Visit $visit)
    {
        if ($visit->doctor_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if (!$this->doctorHasPatientLink($request->user()->id, $visit->patient_user_id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->formatVisitDetail($visit));
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);

        if (!$this->doctorHasPatientLink($request->user()->id, $data['patient_user_id'])) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $data['patient_user_id'])) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }

        $visit = Visit::create([
            ...$data,
            'doctor_user_id' => $request->user()->id,
            'status' => $data['status'] ?? 'open',
        ]);

        return response()->json($this->formatVisit($visit), 201);
    }

    public function update(Request $request, Visit $visit)
    {
        if ($visit->doctor_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $this->validatePayload($request);

        if ($visit->patient_user_id !== $data['patient_user_id']) {
            return response()->json(['message' => 'Modification du patient impossible.'], 422);
        }

        if (!$this->ensureFamilyMemberBelongsToPatient($data['family_member_id'] ?? null, $data['patient_user_id'])) {
            return response()->json(['message' => 'Membre de famille invalide.'], 422);
        }

        $visit->update([
            ...$data,
            'status' => $data['status'] ?? $visit->status,
        ]);

        return response()->json($this->formatVisitDetail($visit->refresh()));
    }
}
