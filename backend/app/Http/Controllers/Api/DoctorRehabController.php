<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Models\RehabEntry;
use App\Models\User;
use Illuminate\Http\Request;

class DoctorRehabController extends Controller
{
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

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'prescription_id' => ['nullable', 'integer', 'exists:prescriptions,id'],
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

    private function formatRow(RehabEntry $entry): array
    {
        return [
            ...$entry->toArray(),
            'doctor_name' => $entry->doctor?->name,
            'prescription_print_code' => $entry->prescription?->print_code,
            'prescription_requested_at' => optional($entry->prescription?->requested_at)->toIso8601String(),
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
            ->with(['doctor:id,name', 'prescription:id,print_code,requested_at'])
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

        $data = $this->validatePayload($request);
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $row = RehabEntry::create([
            ...$data,
            'patient_user_id' => $patient->id,
            'doctor_user_id' => $doctor->id,
        ])->load(['doctor:id,name', 'prescription:id,print_code,requested_at']);

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

        $data = $this->validatePayload($request);
        if (!$this->ensurePrescriptionLinkForDoctor($data['prescription_id'] ?? null, $doctor->id, $patient->id)) {
            return response()->json(['message' => 'Ordonnance invalide pour ce patient.'], 422);
        }

        $entry->update($data);

        return response()->json($this->formatRow($entry->fresh(['doctor:id,name', 'prescription:id,print_code,requested_at'])));
    }
}

