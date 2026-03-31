<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
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
            ->with(['medicineRequests', 'responses'])
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
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
            ->with(['medicineRequests', 'responses'])
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function index()
    {
        $prescriptions = Prescription::query()
            ->with(['medicineRequests', 'responses'])
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_name' => ['required', 'string', 'max:255'],
            'patient_user_id' => ['nullable', 'integer', 'exists:users,id'],
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

        $patientUser = null;
        if (!empty($data['patient_user_id'])) {
            $patientUser = User::query()
                ->where('id', $data['patient_user_id'])
                ->where('role', 'patient')
                ->first();
        } else {
            $patientUser = User::query()
                ->where('name', $data['patient_name'])
                ->where('role', 'patient')
                ->first();
        }

        if ($patientUser === null) {
            return response()->json([
                'message' => 'Patient introuvable. Veuillez utiliser un patient existant.'
            ], 422);
        }

        $doctor = $request->user();
        $prescription = Prescription::create([
            'patient_user_id' => $patientUser->id,
            'doctor_user_id' => $doctor->id,
            'patient_name' => $patientUser->name,
            'doctor_name' => $doctor->name,
            'status' => 'sent_to_pharmacies'
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
            $prescription->load(['medicineRequests', 'responses']),
            201
        );
    }

    public function show(Prescription $prescription)
    {
        $prescription->load(['medicineRequests', 'responses']);
        $prescription->refreshStatusFromResponses($this->expireHours());

        return response()->json(
            $prescription
        );
    }

    public function completeForPatient(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->changeStatus('completed', $request->user()->id, 'patient_completed');

        return response()->json($prescription->load(['medicineRequests', 'responses']));
    }

    public function reopenForPatient(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->changeStatus('sent_to_pharmacies', $request->user()->id, 'patient_reopened');
        $prescription->load(['medicineRequests', 'responses']);
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

        return response()->json($prescription->load(['medicineRequests', 'responses']));
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
