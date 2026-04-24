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
use Throwable;

class DoctorVisitController extends Controller
{
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

    private function normalizeVisitDate(string $value): ?string
    {
        try {
            return Carbon::parse(trim($value))->format('Y-m-d H:i:s');
        } catch (Throwable $exception) {
            return null;
        }
    }

    private function visitReference(Visit $visit): string
    {
        $referenceDate = optional($visit->visit_date ?? $visit->created_at)->toDateString() ?? now()->toDateString();
        $date = str_replace('-', '', $referenceDate);

        static $dailyVisitIdsByDate = [];
        if (!array_key_exists($referenceDate, $dailyVisitIdsByDate)) {
            $dailyVisitIdsByDate[$referenceDate] = Visit::query()
                ->whereDate('visit_date', $referenceDate)
                ->orderBy('id')
                ->pluck('id')
                ->all();
        }

        $index = array_search($visit->id, $dailyVisitIdsByDate[$referenceDate], true);
        $dailySequence = $index === false ? 1 : ($index + 1);

        return 'VIS-' . $date . '-' . str_pad((string) $dailySequence, 6, '0', STR_PAD_LEFT);
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

    private function formatVisit(Visit $visit): array
    {
        return [
            'id' => $visit->id,
            'visit_code' => $this->visitReference($visit),
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
            'reference' => $rehab->reference,
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
            'patient_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
        ]);

        $familyMemberId = $request->input('family_member_id');
        $patientUserId = $data['patient_user_id'] ?? null;

        if ($patientUserId !== null) {
            $patient = User::query()
                ->where('id', $patientUserId)
                ->where('role', 'patient')
                ->first();

            if ($patient === null) {
                return response()->json(['message' => 'Patient introuvable.'], 404);
            }

            if (!$this->ensureFamilyMemberBelongsToPatient($familyMemberId ?? null, $patientUserId)) {
                return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
            }
        }

        $query = Visit::query()
            ->where('doctor_user_id', $request->user()->id)
            ->when($patientUserId, fn ($builder) => $builder->where('patient_user_id', $patientUserId))
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

    public function patientIndex(Request $request)
    {
        $data = $request->validate([
            'family_member_id' => ['nullable', 'integer', 'exists:family_members,id'],
        ]);

        $familyMemberId = $data['family_member_id'] ?? null;
        $patientUserId = $request->user()->id;

        if (!$this->ensureFamilyMemberBelongsToPatient($familyMemberId, $patientUserId)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }

        $visits = Visit::query()
            ->where('patient_user_id', $patientUserId)
            ->when($familyMemberId, fn ($builder) => $builder->where('family_member_id', $familyMemberId))
            ->with(['doctor:id,name', 'patient:id,name', 'familyMember:id,name'])
            ->withCount(['prescriptions', 'medicalHistoryEntries', 'rehabEntries'])
            ->orderByDesc('visit_date')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($visits->map(fn (Visit $visit) => $this->formatVisit($visit)));
    }

    public function store(Request $request)
    {
        $request->merge([
            'family_member_id' => $this->normalizeNullableId($request->input('family_member_id')),
        ]);

        $data = $this->validatePayload($request);
        $doctor = $request->user();

        $patient = User::query()
            ->where('id', (int) $data['patient_user_id'])
            ->where('role', 'patient')
            ->first();
        if (!$patient) {
            return response()->json(['message' => 'Patient introuvable.'], 404);
        }

        if (!$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $familyMemberId = $this->normalizeNullableId($data['family_member_id'] ?? null);
        if (!$this->ensureFamilyMemberBelongsToPatient($familyMemberId, $patient->id)) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }

        $normalizedVisitDate = $this->normalizeVisitDate((string) $data['visit_date']);
        if (!$normalizedVisitDate) {
            return response()->json(['message' => 'Date de visite invalide.'], 422);
        }

        try {
            $visit = DB::transaction(function () use ($data, $doctor, $patient, $familyMemberId, $normalizedVisitDate) {
                return Visit::query()->create([
                    'patient_user_id' => $patient->id,
                    'family_member_id' => $familyMemberId,
                    'doctor_user_id' => $doctor->id,
                    'visit_date' => $normalizedVisitDate,
                    'visit_type' => $data['visit_type'] ?? null,
                    'chief_complaint' => $data['chief_complaint'] ?? null,
                    'diagnosis' => $data['diagnosis'] ?? null,
                    'clinical_notes' => $data['clinical_notes'] ?? null,
                    'treatment_plan' => $data['treatment_plan'] ?? null,
                    'status' => $data['status'] ?? 'open',
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Impossible de creer la visite pour le moment. Veuillez reessayer.'], 422);
        }

        return response()->json($this->formatVisit($visit), 201);
    }

    public function update(Request $request, Visit $visit)
    {
        if ($visit->doctor_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $request->merge([
            'family_member_id' => $this->normalizeNullableId($request->input('family_member_id')),
        ]);
        $data = $this->validatePayload($request);

        if ($visit->patient_user_id !== $data['patient_user_id']) {
            return response()->json(['message' => 'Modification du patient impossible.'], 422);
        }

        $familyMemberId = $this->normalizeNullableId($data['family_member_id'] ?? null);
        if (!$this->ensureFamilyMemberBelongsToPatient($familyMemberId, (int) $data['patient_user_id'])) {
            return response()->json(['message' => 'Membre de famille invalide pour ce patient.'], 422);
        }

        $normalizedVisitDate = $this->normalizeVisitDate((string) $data['visit_date']);
        if (!$normalizedVisitDate) {
            return response()->json(['message' => 'Date de visite invalide.'], 422);
        }

        try {
            $visit->update([
                'family_member_id' => $familyMemberId,
                'visit_date' => $normalizedVisitDate,
                'visit_type' => $data['visit_type'] ?? null,
                'chief_complaint' => $data['chief_complaint'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'clinical_notes' => $data['clinical_notes'] ?? null,
                'treatment_plan' => $data['treatment_plan'] ?? null,
                'status' => $data['status'] ?? $visit->status,
            ]);
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Impossible de mettre a jour la visite pour le moment. Veuillez reessayer.'], 422);
        }

        return response()->json($this->formatVisitDetail($visit->refresh()));
    }
}
