<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorSecretaryAccessRequest;
use App\Models\User;
use Illuminate\Http\Request;

class DoctorSecretaryAccessRequestController extends Controller
{
    private function ensureSecretary(User $secretary): void
    {
        if ($secretary->role !== 'secretaire') {
            abort(422, 'Secretaire invalide.');
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

    private function formatRequest(DoctorSecretaryAccessRequest $requestRow): array
    {
        return [
            'id' => $requestRow->id,
            'doctor_id' => $requestRow->doctor_user_id,
            'doctor_name' => $requestRow->doctor?->name,
            'secretary_id' => $requestRow->secretary_user_id,
            'secretary_name' => $requestRow->secretary?->name,
            'status' => $requestRow->status,
            'message' => $requestRow->message,
            'response_message' => $requestRow->response_message,
            'responded_at' => optional($requestRow->responded_at)?->toIso8601String(),
            'created_at' => $requestRow->created_at->toIso8601String(),
        ];
    }

    public function search(Request $request)
    {
        $query = trim((string) $request->query('query', ''));
        $rows = User::query()
            ->where('role', 'secretaire')
            ->where('verification_status', 'approved')
            ->when($query !== '', function ($builder) use ($query) {
                $builder->where(function ($inner) use ($query) {
                    $inner
                        ->where('name', 'like', '%' . $query . '%')
                        ->orWhere('email', 'like', '%' . $query . '%')
                        ->orWhere('phone', 'like', '%' . $query . '%')
                        ->orWhere('whatsapp', 'like', '%' . $query . '%');
                });
            })
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'email', 'phone', 'whatsapp', 'account_status', 'verification_status']);

        return response()->json($rows->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'whatsapp' => $user->whatsapp,
            'account_status' => $user->account_status,
            'verification_status' => $user->verification_status,
        ])->values());
    }

    public function status(Request $request, User $secretary)
    {
        $this->ensureSecretary($secretary);
        $doctor = $request->user();

        return response()->json([
            'has_link' => DoctorSecretaryAccessRequest::hasApprovedAccess($doctor->id, $secretary->id),
            'has_pending_request' => DoctorSecretaryAccessRequest::hasPendingRequest($doctor->id, $secretary->id),
        ]);
    }

    public function store(Request $request, User $secretary)
    {
        $this->ensureSecretary($secretary);
        $doctor = $request->user();

        if ((int) $doctor->id === (int) $secretary->id) {
            return response()->json(['message' => 'Action invalide.'], 422);
        }

        if (DoctorSecretaryAccessRequest::hasApprovedAccess($doctor->id, $secretary->id)) {
            return response()->json(['message' => 'Vous avez deja acces a cette secretaire.'], 409);
        }

        if (DoctorSecretaryAccessRequest::hasPendingRequest($doctor->id, $secretary->id)) {
            $pendingRequest = DoctorSecretaryAccessRequest::query()
                ->where('doctor_user_id', $doctor->id)
                ->where('secretary_user_id', $secretary->id)
                ->where('status', 'pending')
                ->latest('id')
                ->first();

            if (!$pendingRequest) {
                return response()->json(['message' => 'Une demande est deja en attente.'], 409);
            }

            $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
            $approvalUrl = $frontendBase . '/secretaire/access-requests';
            $text = "Bonjour {$secretary->name},\nLe docteur {$doctor->name} demande un acces secretaire.\n";
            $text .= "Cliquez pour approuver ou refuser: {$approvalUrl}";
            if (!empty($pendingRequest->message)) {
                $text .= "\n\nMessage du medecin: {$pendingRequest->message}";
            }

            $targetWhatsapp = $secretary->recovery_whatsapp ?: $secretary->whatsapp;
            $whatsappUrl = $this->buildWhatsappUrl($targetWhatsapp, $text);

            return response()->json([
                ...$this->formatRequest($pendingRequest->loadMissing(['doctor:id,name', 'secretary:id,name'])),
                'message' => 'Une demande est deja en attente.',
                'whatsapp_url' => $whatsappUrl,
            ]);
        }

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $accessRequest = DoctorSecretaryAccessRequest::create([
            'doctor_user_id' => $doctor->id,
            'secretary_user_id' => $secretary->id,
            'message' => $data['message'] ?? null,
        ]);

        $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
        $approvalUrl = $frontendBase . '/secretaire/access-requests';
        $text = "Bonjour {$secretary->name},\nLe docteur {$doctor->name} demande un acces secretaire.\n";
        $text .= "Cliquez pour approuver ou refuser: {$approvalUrl}";
        if (!empty($data['message'])) {
            $text .= "\n\nMessage du medecin: {$data['message']}";
        }

        $targetWhatsapp = $secretary->recovery_whatsapp ?: $secretary->whatsapp;
        $whatsappUrl = $this->buildWhatsappUrl($targetWhatsapp, $text);

        return response()->json([
            ...$this->formatRequest($accessRequest->loadMissing(['doctor:id,name', 'secretary:id,name'])),
            'whatsapp_url' => $whatsappUrl,
        ], 201);
    }

    public function doctorIndex(Request $request)
    {
        $doctor = $request->user();
        $rows = DoctorSecretaryAccessRequest::query()
            ->where('doctor_user_id', $doctor->id)
            ->with('secretary:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows->map(fn (DoctorSecretaryAccessRequest $row) => $this->formatRequest($row))->values());
    }

    public function secretaryIndex(Request $request)
    {
        $secretary = $request->user();
        $rows = DoctorSecretaryAccessRequest::query()
            ->where('secretary_user_id', $secretary->id)
            ->with('doctor:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows->map(fn (DoctorSecretaryAccessRequest $row) => $this->formatRequest($row))->values());
    }

    public function respond(Request $request, DoctorSecretaryAccessRequest $accessRequest)
    {
        if ($accessRequest->secretary_user_id !== $request->user()->id) {
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

        return response()->json($this->formatRequest($accessRequest->loadMissing(['doctor:id,name', 'secretary:id,name'])));
    }
}
