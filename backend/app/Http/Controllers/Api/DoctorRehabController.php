<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

class DoctorRehabController extends Controller
{
    private function runWithRetry(callable $callback, int $maxAttempts = 2): mixed
    {
        $attempt = 0;
        start:
        try {
            return $callback();
        } catch (Throwable $exception) {
            $attempt++;
            report($exception);
            if ($attempt < $maxAttempts) {
                usleep(150000);
                goto start;
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
            'medical_history_entry_id' => $this->normalizeNullableId($request->input('medical_history_entry_id')),
            'prescription_id' => $this->normalizeNullableId($request->input('prescription_id')),
            'visit_id' => $this->normalizeNullableId($request->input('visit_id')),
            'follow_up_date' => $this->normalizeDateInput($request->input('follow_up_date')),
        ]);
    }

    private function doctorHasPatientLink(int $doctorUserId, int $patientUserId): bool
    {
        return DoctorPatientAccessEvaluator::hasLink($doctorUserId, $patientUserId);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'medical_history_entry_id' => ['nullable', 'integer', 'exists:medical_history_entries,id'],
            'prescription_id' => ['nullable', 'integer', 'exists:prescriptions,id'],
            'visit_id' => ['nullable', 'integer', 'exists:visits,id'],
            'sessions_per_week' => ['nullable', 'integer', 'min:1', 'max:14'],
            'duration_weeks' => ['nullable', 'integer', 'min:1', 'max:104'],
            'goals' => ['nullable', 'string', 'max:2000'],
            'exercise_type' => ['nullable', 'string', 'max:255'],
            'exercise_reps' => ['nullable', 'string', 'max:120'],
            'exercise_frequency' => ['nullable', 'string', 'max:120'],
            'exercise_notes' => ['nullable', 'string', 'max:2000'],
            'pain_score' => ['nullable', 'integer', 'min:0', 'max:10'],
            'mobility_score' => ['nullable', 'string', 'max:120'],
            'progress_notes' => ['nullable', 'string', 'max:3000'],
            'follow_up_date' => ['nullable', 'date'],
        ]);
    }

    private function ensurePrescriptionLinkForDoctor(?int $prescriptionId, int $doctorId, int $patientId): bool
    {
        if (!$prescriptionId) {
            return true;
        }

        return Prescription::query()
            ->where('id', $prescriptionId)
            ->where('doctor_user_id', $doctorId)
            ->where('patient_user_id', $patientId)
            ->exists();
    }

    private function ensureMedicalHistoryLinkForDoctor(?int $entryId, int $doctorId, int $patientId): bool
    {
        if (!$entryId) {
            return true;
        }

        return MedicalHistoryEntry::query()
            ->where('id', $entryId)
            ->where('patient_user_id', $patientId)
            ->where('visibility', '!=', 'patient_only')
            ->where(function ($query) use ($doctorId) {
                $query
                    ->where('visibility', '!=', 'doctor_only')
                    ->orWhere('doctor_user_id', $doctorId);
            })
            ->exists();
    }

    private function ensureVisitLinkForDoctor(?int $visitId, int $doctorId, int $patientId): bool
    {
        if (!$visitId) {
            return true;
        }

        return Visit::query()
            ->where('id', $visitId)
            ->where('doctor_user_id', $doctorId)
            ->where('patient_user_id', $patientId)
            ->exists();
    }

    private function formatRow(RehabEntry $entry): array
    {
        return [
            ...$entry->toArray(),
            'reference' => $entry->reference,
            'doctor_name' => $entry->doctor?->name,
            'prescription_print_code' => $entry->prescription?->print_code,
            'prescription_requested_at' => optional($entry->prescription?->requested_at)->toIso8601String(),
            'medical_history_entry_code' => $entry->medicalHistoryEntry?->entry_code,
            'medical_history_entry_title' => $entry->medicalHistoryEntry?->title,
        ];
    }

    public function index(Request $request, User $patient)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $rows = RehabEntry::query()
            ->where('patient_user_id', $patient->id)
            ->where('doctor_user_id', $doctor->id)
            ->with([
                'doctor:id,name',
                'prescription:id,print_code,requested_at',
                'medicalHistoryEntry:id,entry_code,title',
            ])
            ->orderByDesc('follow_up_date')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows->map(fn (RehabEntry $row) => $this->formatRow($row))->values());
    }

    public function store(Request $request, User $patient)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }
        if (!$this->ensureMedicalHistoryLinkForDoctor($data['medical_history_entry_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Historique medical invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitLinkForDoctor($data['visit_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }

        try {
            $row = $this->runWithRetry(function () use ($data, $patient, $doctor) {
                return DB::transaction(function () use ($data, $patient, $doctor) {
                    return RehabEntry::query()->create([
                        ...$data,
                        'patient_user_id' => $patient->id,
                        'doctor_user_id' => $doctor->id,
                    ]);
                });
            })->load([
                'doctor:id,name',
                'prescription:id,print_code,requested_at',
                'medicalHistoryEntry:id,entry_code,title',
            ]);
        } catch (Throwable $exception) {
            return response()->json(['message' => 'Impossible de creer la reeducation pour le moment. Veuillez reessayer.'], 422);
        }

        return response()->json($this->formatRow($row), 201);
    }

    public function update(Request $request, User $patient, RehabEntry $entry)
    {
        $doctor = $request->user();
        if ($patient->role !== 'patient' || !$this->doctorHasPatientLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ((int) $entry->patient_user_id !== (int) $patient->id || (int) $entry->doctor_user_id !== (int) $doctor->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $this->normalizePayloadInputs($request);
        $data = $this->validatePayload($request);
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }
        if (!$this->ensureMedicalHistoryLinkForDoctor($data['medical_history_entry_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Historique medical invalide pour ce patient.'], 422);
        }
        if (!$this->ensureVisitLinkForDoctor($data['visit_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Visite invalide pour ce patient.'], 422);
        }

        try {
            $this->runWithRetry(function () use ($entry, $data) {
                return DB::transaction(function () use ($entry, $data) {
                    $entry->update($data);
                    return true;
                });
            });
        } catch (Throwable $exception) {
            return response()->json(['message' => 'Impossible de mettre a jour la reeducation pour le moment. Veuillez reessayer.'], 422);
        }

        return response()->json($this->formatRow($entry->fresh([
            'doctor:id,name',
            'prescription:id,print_code,requested_at',
            'medicalHistoryEntry:id,entry_code,title',
        ])));
    }
}
