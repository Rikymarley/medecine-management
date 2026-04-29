<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\DoctorSecretaryAccessRequest;
use App\Models\User;
use App\Services\DoctorPatientAccessEvaluator;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    private function formatRow(Appointment $row): array
    {
        return [
            'id' => $row->id,
            'patient_id' => $row->patient_user_id,
            'patient_name' => $row->patient?->name,
            'doctor_user_id' => $row->doctor_user_id,
            'doctor_name' => $row->doctor?->name,
            'created_by_user_id' => $row->created_by_user_id,
            'created_by_role' => $row->created_by_role,
            'scheduled_at' => optional($row->scheduled_at)->toIso8601String(),
            'note' => $row->note,
            'status' => $row->status,
            'created_at' => optional($row->created_at)->toIso8601String(),
            'updated_at' => optional($row->updated_at)->toIso8601String(),
        ];
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'patient_id' => ['required', 'integer', 'exists:users,id'],
            'doctor_user_id' => ['required', 'integer', 'exists:users,id'],
            'scheduled_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'status' => ['nullable', 'string', 'max:40'],
        ]);
    }

    private function secretaryDoctorIds(int $secretaryId): array
    {
        return DoctorSecretaryAccessRequest::query()
            ->where('secretary_user_id', $secretaryId)
            ->where('status', 'approved')
            ->pluck('doctor_user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function ensurePatientExists(int $patientId): bool
    {
        return User::query()->where('id', $patientId)->where('role', 'patient')->exists();
    }

    public function patientIndex(Request $request)
    {
        $rows = Appointment::query()
            ->where('patient_user_id', $request->user()->id)
            ->with(['doctor:id,name', 'patient:id,name'])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->get();

        return response()->json($rows->map(fn (Appointment $row) => $this->formatRow($row))->values());
    }

    public function doctorIndex(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $doctorId = (int) $request->user()->id;
        $query = Appointment::query()
            ->where('doctor_user_id', $doctorId)
            ->with(['doctor:id,name', 'patient:id,name'])
            ->orderBy('scheduled_at')
            ->orderBy('id');

        if (!empty($data['patient_id'])) {
            $query->where('patient_user_id', (int) $data['patient_id']);
        }

        $rows = $query->get();
        return response()->json($rows->map(fn (Appointment $row) => $this->formatRow($row))->values());
    }

    public function secretaryIndex(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $doctorIds = $this->secretaryDoctorIds((int) $request->user()->id);
        if (empty($doctorIds)) {
            return response()->json([]);
        }

        $query = Appointment::query()
            ->whereIn('doctor_user_id', $doctorIds)
            ->with(['doctor:id,name', 'patient:id,name'])
            ->orderBy('scheduled_at')
            ->orderBy('id');

        if (!empty($data['patient_id'])) {
            $query->where('patient_user_id', (int) $data['patient_id']);
        }

        $rows = $query->get();
        return response()->json($rows->map(fn (Appointment $row) => $this->formatRow($row))->values());
    }

    public function doctorStore(Request $request)
    {
        $payload = $this->validatePayload($request);
        $doctorId = (int) $request->user()->id;
        $patientId = (int) $payload['patient_id'];

        if (!$this->ensurePatientExists($patientId)) {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }
        if ((int) $payload['doctor_user_id'] !== $doctorId) {
            return response()->json(['message' => 'Le medecin selectionne est invalide.'], 422);
        }
        if (!DoctorPatientAccessEvaluator::hasLink($doctorId, $patientId)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $row = Appointment::query()->create([
            'patient_user_id' => $patientId,
            'doctor_user_id' => $doctorId,
            'created_by_user_id' => $doctorId,
            'created_by_role' => 'doctor',
            'scheduled_at' => $payload['scheduled_at'],
            'note' => $payload['note'] ?? null,
            'status' => $payload['status'] ?? 'scheduled',
        ]);
        $row->load(['doctor:id,name', 'patient:id,name']);

        return response()->json($this->formatRow($row), 201);
    }

    public function secretaryStore(Request $request)
    {
        $payload = $this->validatePayload($request);
        $secretaryId = (int) $request->user()->id;
        $patientId = (int) $payload['patient_id'];
        $doctorId = (int) $payload['doctor_user_id'];
        $allowedDoctorIds = $this->secretaryDoctorIds($secretaryId);

        if (!$this->ensurePatientExists($patientId)) {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }
        if (!in_array($doctorId, $allowedDoctorIds, true)) {
            return response()->json(['message' => 'Medecin indisponible pour cette secretaire.'], 403);
        }
        if (!DoctorPatientAccessEvaluator::hasLink($doctorId, $patientId)) {
            return response()->json(['message' => 'Ce medecin n a pas acces a ce patient.'], 403);
        }

        $row = Appointment::query()->create([
            'patient_user_id' => $patientId,
            'doctor_user_id' => $doctorId,
            'created_by_user_id' => $secretaryId,
            'created_by_role' => 'secretaire',
            'scheduled_at' => $payload['scheduled_at'],
            'note' => $payload['note'] ?? null,
            'status' => $payload['status'] ?? 'scheduled',
        ]);
        $row->load(['doctor:id,name', 'patient:id,name']);

        return response()->json($this->formatRow($row), 201);
    }

    public function doctorUpdate(Request $request, Appointment $appointment)
    {
        if ((int) $appointment->doctor_user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $payload = $this->validatePayload($request);
        $doctorId = (int) $request->user()->id;
        $patientId = (int) $payload['patient_id'];

        if (!$this->ensurePatientExists($patientId)) {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }
        if ((int) $payload['doctor_user_id'] !== $doctorId) {
            return response()->json(['message' => 'Le medecin selectionne est invalide.'], 422);
        }
        if (!DoctorPatientAccessEvaluator::hasLink($doctorId, $patientId)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $appointment->update([
            'patient_user_id' => $patientId,
            'doctor_user_id' => $doctorId,
            'scheduled_at' => $payload['scheduled_at'],
            'note' => $payload['note'] ?? null,
            'status' => $payload['status'] ?? $appointment->status,
        ]);
        $appointment->load(['doctor:id,name', 'patient:id,name']);

        return response()->json($this->formatRow($appointment));
    }

    public function secretaryUpdate(Request $request, Appointment $appointment)
    {
        $secretaryId = (int) $request->user()->id;
        $allowedDoctorIds = $this->secretaryDoctorIds($secretaryId);
        if (!in_array((int) $appointment->doctor_user_id, $allowedDoctorIds, true)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $payload = $this->validatePayload($request);
        $patientId = (int) $payload['patient_id'];
        $doctorId = (int) $payload['doctor_user_id'];

        if (!$this->ensurePatientExists($patientId)) {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }
        if (!in_array($doctorId, $allowedDoctorIds, true)) {
            return response()->json(['message' => 'Medecin indisponible pour cette secretaire.'], 403);
        }
        if (!DoctorPatientAccessEvaluator::hasLink($doctorId, $patientId)) {
            return response()->json(['message' => 'Ce medecin n a pas acces a ce patient.'], 403);
        }

        $appointment->update([
            'patient_user_id' => $patientId,
            'doctor_user_id' => $doctorId,
            'scheduled_at' => $payload['scheduled_at'],
            'note' => $payload['note'] ?? null,
            'status' => $payload['status'] ?? $appointment->status,
        ]);
        $appointment->load(['doctor:id,name', 'patient:id,name']);

        return response()->json($this->formatRow($appointment));
    }
}

