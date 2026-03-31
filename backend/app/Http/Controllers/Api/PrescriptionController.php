<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    private function expireHours(): int
    {
        return max(1, (int) env('PRESCRIPTION_EXPIRE_HOURS', 1));
    }

    public function mine(Request $request)
    {
        $doctorName = $request->user()->name;

        $prescriptions = Prescription::query()
            ->where('doctor_name', $doctorName)
            ->with(['medicineRequests', 'responses'])
            ->orderByDesc('requested_at')
            ->get();
        $prescriptions->each(fn (Prescription $prescription) => $prescription->refreshStatusFromResponses($this->expireHours()));

        return response()->json($prescriptions);
    }

    public function mineForPatient(Request $request)
    {
        $patientName = $request->user()->name;

        $prescriptions = Prescription::query()
            ->where('patient_name', $patientName)
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
            'medicine_requests' => ['required', 'array', 'min:1'],
            'medicine_requests.*.name' => ['required', 'string', 'max:255'],
            'medicine_requests.*.strength' => ['nullable', 'string', 'max:50'],
            'medicine_requests.*.form' => ['nullable', 'string', 'max:50'],
            'medicine_requests.*.quantity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'medicine_requests.*.generic_allowed' => ['boolean'],
            'medicine_requests.*.conversion_allowed' => ['boolean']
        ]);

        $prescription = Prescription::create([
            'patient_name' => $data['patient_name'],
            'doctor_name' => $request->user()->name,
            'status' => 'sent_to_pharmacies'
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
        if ($prescription->patient_name !== $request->user()->name) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->update(['status' => 'completed']);

        return response()->json($prescription->load(['medicineRequests', 'responses']));
    }

    public function reopenForPatient(Request $request, Prescription $prescription)
    {
        if ($prescription->patient_name !== $request->user()->name) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $prescription->update(['status' => 'sent_to_pharmacies']);
        $prescription->load(['medicineRequests', 'responses']);
        $prescription->refreshStatusFromResponses($this->expireHours());

        return response()->json($prescription);
    }
}
