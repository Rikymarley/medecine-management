<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorPatientAccessRequest;
use App\Models\User;
use App\Services\DoctorPatientAccessEvaluator;
use Illuminate\Http\Request;

class DoctorPatientAccessRequestController extends Controller
{
    private function ensurePatient(User $patient): void
    {
        if ($patient->role !== 'patient') {
            abort(422, 'Patient invalide.');
        }
    }

    private function buildWhatsappUrl(?string $target, string $text): ?string
    {
        if (!$target) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $target);
        if (!$digits) {
            return null;
        }

        return 'https://wa.me/' . $digits . '?text=' . rawurlencode($text);
    }

    private function formatRequest(DoctorPatientAccessRequest $requestRow): array
    {
        return [
            'id' => $requestRow->id,
            'doctor_id' => $requestRow->doctor_user_id,
            'doctor_name' => $requestRow->doctor?->name,
            'status' => $requestRow->status,
            'message' => $requestRow->message,
            'response_message' => $requestRow->response_message,
            'responded_at' => optional($requestRow->responded_at)?->toIso8601String(),
            'created_at' => $requestRow->created_at->toIso8601String(),
        ];
    }

    public function status(Request $request, User $patient)
    {
        $this->ensurePatient($patient);

        $doctor = $request->user();
        $hasLink = DoctorPatientAccessEvaluator::hasLink($doctor->id, $patient->id);
        $pending = DoctorPatientAccessRequest::hasPendingRequest($doctor->id, $patient->id);

        return response()->json([
            'has_link' => $hasLink,
            'has_pending_request' => $pending,
        ]);
    }

    public function store(Request $request, User $patient)
    {
        $this->ensurePatient($patient);

        $doctor = $request->user();
        if (DoctorPatientAccessEvaluator::hasLink($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Vous avez deja acces a ce patient.'], 409);
        }

        if (DoctorPatientAccessRequest::hasPendingRequest($doctor->id, $patient->id)) {
            return response()->json(['message' => 'Une demande est deja en attente.'], 409);
        }

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $accessRequest = DoctorPatientAccessRequest::create([
            'patient_user_id' => $patient->id,
            'doctor_user_id' => $doctor->id,
            'message' => $data['message'] ?? null,
        ]);

        $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
        $approvalUrl = $frontendBase . '/patient/access-requests';
        $text = "Bonjour {$patient->name},\nLe docteur {$doctor->name} demande l'accès a votre dossier.\n";
        $text .= "Cliquez pour approuver ou refuser: {$approvalUrl}";
        if (!empty($data['message'])) {
            $text .= "\n\nMessage du medecin: {$data['message']}";
        }

        $targetWhatsapp = $patient->recovery_whatsapp ?: $patient->whatsapp;
        $whatsappUrl = $this->buildWhatsappUrl($targetWhatsapp, $text);

        return response()->json([
            'id' => $accessRequest->id,
            'status' => $accessRequest->status,
            'message' => $accessRequest->message,
            'whatsapp_url' => $whatsappUrl,
        ], 201);
    }

    public function patientIndex(Request $request)
    {
        $patient = $request->user();
        $rows = DoctorPatientAccessRequest::query()
            ->where('patient_user_id', $patient->id)
            ->with('doctor:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows->map(fn (DoctorPatientAccessRequest $row) => [
            ...$this->formatRequest($row),
            'doctor_name' => $row->doctor?->name,
        ])->values());
    }

    public function respond(Request $request, DoctorPatientAccessRequest $accessRequest)
    {
        if ($accessRequest->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ($accessRequest->status !== 'pending') {
            return response()->json(['message' => 'La demande a deja ete traitee.'], 422);
        }

        $data = $request->validate([
            'status' => ['required', 'in:approved,denied'],
            'response_message' => ['nullable', 'string', 'max:2000'],
        ]);

        $accessRequest->update([
            'status' => $data['status'],
            'response_message' => $data['response_message'] ?? null,
            'responded_at' => now(),
        ]);

        return response()->json($this->formatRequest($accessRequest));
    }
}
