<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorSpecialty;
use App\Models\FamilyMember;
use App\Models\PasswordResetLink;
use App\Models\PasswordResetEvent;
use App\Models\Pharmacy;
use App\Models\PasswordResetRecoveryApproval;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function uploadDisk(): string
    {
        return (string) config('filesystems.upload_disk', 'public');
    }

    private function maskPhone(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value) ?: '';
        if ($digits === '') {
            return 'N/D';
        }
        $tail = substr($digits, -4);
        return '+***-****-' . $tail;
    }

    private function logPasswordResetEvent(
        Request $request,
        string $action,
        bool $success,
        ?User $user = null,
        ?string $identifier = null,
        ?string $reason = null
    ): void {
        PasswordResetEvent::create([
            'user_id' => $user?->id,
            'action' => $action,
            'channel' => 'whatsapp',
            'identifier_masked' => $identifier ? $this->maskPhone($identifier) : null,
            'success' => $success,
            'reason' => $reason,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
        ]);
    }

    private function normalizeSpecialty(string $value): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $ascii = strtolower(trim($ascii));
        return preg_replace('/[^a-z0-9]+/', ' ', $ascii) ?: $ascii;
    }

    private function queueDoctorSpecialtyIfNew(?string $specialty, ?int $createdByUserId = null): void
    {
        $name = trim((string) $specialty);
        if ($name === '') {
            return;
        }

        $normalized = $this->normalizeSpecialty($name);
        if ($normalized === '') {
            return;
        }

        $existing = DoctorSpecialty::where('normalized_name', $normalized)->first();
        if ($existing) {
            return;
        }

        DoctorSpecialty::create([
            'name' => $name,
            'normalized_name' => $normalized,
            'status' => 'pending',
            'is_active' => false,
            'created_by_user_id' => $createdByUserId,
        ]);
    }

    private function deleteIfLocalStorageUrl(?string $url): void
    {
        if (!$url) {
            return;
        }

        $disk = $this->uploadDisk();
        $path = parse_url($url, PHP_URL_PATH);
        if (!$path) {
            return;
        }

        if (str_starts_with($path, '/storage/')) {
            $relative = ltrim(substr($path, strlen('/storage/')), '/');
        } else {
            $relative = ltrim($path, '/');
        }

        if ($relative !== '') {
            Storage::disk($disk)->delete($relative);
        }
    }

    private function uploadUserImage(Request $request, User $user, string $requestFileKey, string $dbField, string $directory): User
    {
        $request->validate([
            $requestFileKey => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $disk = $this->uploadDisk();
        $uploaded = $request->file($requestFileKey);
        $path = $uploaded->store($directory, $disk);
        $publicUrl = Storage::disk($disk)->url($path);

        $this->deleteIfLocalStorageUrl($user->{$dbField});
        $user->update([$dbField => $publicUrl]);

        return $user->fresh();
    }

    private function uploadUserDocument(Request $request, User $user, string $requestFileKey, string $dbField, string $directory): User
    {
        $request->validate([
            $requestFileKey => ['required', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:4096'],
        ]);

        $disk = $this->uploadDisk();
        $uploaded = $request->file($requestFileKey);
        $path = $uploaded->store($directory, $disk);
        $publicUrl = Storage::disk($disk)->url($path);

        $this->deleteIfLocalStorageUrl($user->{$dbField});
        $user->update([$dbField => $publicUrl]);

        return $user->fresh();
    }

    private function presentDoctor(User $doctor): array
    {
        $row = $doctor->toArray();
        $row['license_verified_by_doctor_name'] = $doctor->licenseVerifiedByDoctor?->name;
        $row['approved_by'] = $doctor->verifiedBy?->name;
        $row['approved_at'] = $doctor->verified_at;
        $row['verified_by'] = $doctor->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $doctor->license_verified_at;
        $row['account_verification_status'] = $doctor->verification_status;
        $row['account_verified_at'] = $doctor->verified_at;
        $row['account_verified_by'] = $doctor->verified_by;
        $row['account_verified_by_name'] = $doctor->verifiedBy?->name;
        $row['account_verification_notes'] = $doctor->verification_notes;

        return $row;
    }

    /**
     * Render may occasionally run against a lagging schema during rollouts.
     * Keep doctor-directory queries resilient by selecting only existing columns.
     *
     * @param array<int, string> $columns
     * @return array<int, string>
     */
    private function existingUserColumns(array $columns): array
    {
        $available = array_flip(Schema::getColumnListing('users'));
        $filtered = array_values(array_filter(
            $columns,
            fn (string $column): bool => isset($available[$column])
        ));

        if (!in_array('id', $filtered, true)) {
            array_unshift($filtered, 'id');
        }
        if (!in_array('name', $filtered, true)) {
            $filtered[] = 'name';
        }

        return $filtered;
    }

    public function doctorsDirectory()
    {
        $doctorSelect = $this->existingUserColumns([
            'id',
            'name',
            'phone',
            'address',
            'latitude',
            'longitude',
            'specialty',
            'city',
            'department',
            'languages',
            'teleconsultation_available',
            'consultation_hours',
            'license_number',
            'license_verified',
            'years_experience',
            'consultation_fee_range',
            'whatsapp',
            'bio',
            'profile_photo_url',
            'profile_banner_url',
            'can_verify_accounts',
            'license_verified_at',
            'license_verified_by_doctor_id',
            'license_verification_notes',
        ]);

        $doctors = User::query()
            ->with(['licenseVerifiedByDoctor:id,name', 'verifiedBy:id,name'])
            ->where('role', 'doctor')
            ->where('verification_status', 'approved')
            ->orderBy('name')
            ->get($doctorSelect)
            ->map(fn (User $doctor) => $this->presentDoctor($doctor))
            ->values();

        return response()->json($doctors);
    }

    public function doctorsDirectoryForDoctor()
    {
        $doctorSelect = $this->existingUserColumns([
            'id',
            'name',
            'phone',
            'address',
            'latitude',
            'longitude',
            'specialty',
            'city',
            'department',
            'languages',
            'teleconsultation_available',
            'consultation_hours',
            'license_number',
            'license_verified',
            'license_verified_at',
            'license_verified_by_doctor_id',
            'license_verification_notes',
            'can_verify_accounts',
            'years_experience',
            'consultation_fee_range',
            'whatsapp',
            'bio',
            'profile_photo_url',
            'profile_banner_url',
            'verification_status',
            'verified_at',
            'verified_by',
            'verification_notes',
        ]);

        $doctors = User::query()
            ->with(['licenseVerifiedByDoctor:id,name', 'verifiedBy:id,name'])
            ->where('role', 'doctor')
            ->orderBy('name')
            ->get($doctorSelect)
            ->map(fn (User $doctor) => $this->presentDoctor($doctor))
            ->values();

        return response()->json($doctors);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'specialty' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'languages' => ['nullable', 'string', 'max:255'],
            'teleconsultation_available' => ['nullable', 'boolean'],
            'consultation_hours' => ['nullable', 'string', 'max:3000'],
            'license_number' => ['nullable', 'string', 'max:120'],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:80'],
            'consultation_fee_range' => ['nullable', 'string', 'max:120'],
            'whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'bio' => ['nullable', 'string', 'max:3000'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'chronic_diseases' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'emergency_notes' => ['nullable', 'string', 'max:3000'],
            'weight_kg' => ['nullable', 'numeric', 'between:0.1,500'],
            'height_cm' => ['nullable', 'numeric', 'between:10,300'],
            'surgical_history' => ['nullable', 'string', 'max:5000'],
            'vaccination_up_to_date' => ['nullable', 'boolean'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'in:doctor,pharmacy,patient,hopital,laboratoire,secretaire'],
            'pharmacy_name' => ['nullable', 'required_if:role,pharmacy', 'string', 'max:255']
        ]);

        $pharmacyId = null;
        if ($data['role'] === 'pharmacy') {
            $pharmacy = Pharmacy::create([
                'name' => $data['pharmacy_name'],
                'pharmacy_mode' => 'quick_manual',
                'open_now' => true,
                'reliability_score' => 0
            ]);
            $pharmacyId = $pharmacy->id;
        }

        unset($data['pharmacy_name']);
        $data['pharmacy_id'] = $pharmacyId;
        $data['account_status'] = 'active';
        $data['created_by_doctor_id'] = null;
        $data['verification_status'] = in_array($data['role'], ['doctor', 'pharmacy', 'hopital', 'laboratoire', 'secretaire'], true)
            ? 'pending'
            : 'approved';
        $data['verified_at'] = $data['verification_status'] === 'approved' ? now() : null;
        $data['can_verify_accounts'] = false;
        $data['license_verified_at'] = null;
        $data['license_verified_by_doctor_id'] = null;
        $data['license_verification_notes'] = null;

        $user = User::create($data);
        if ($user->role === 'patient' && Schema::hasColumn('users', 'principal_patient_id')) {
            $user->update(['principal_patient_id' => $user->id]);
        }
        if ($user->role === 'doctor') {
            $this->queueDoctorSpecialtyIfNew($user->specialty, $user->id);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string']
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if ($user->account_status === 'blocked') {
            return response()->json(['message' => 'Compte bloque. Veuillez contacter un administrateur.'], 403);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Deconnexion reussie.']);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifie.'], 401);
        }

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel invalide.'], 422);
        }

        $user->update([
            'password' => $data['password'],
        ]);

        return response()->json(['message' => 'Mot de passe mis a jour.']);
    }

    public function updateRecoveryWhatsapp(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifie.'], 401);
        }

        $data = $request->validate([
            'recovery_whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
        ]);

        $user->update([
            'recovery_whatsapp' => $data['recovery_whatsapp'] ?? null,
        ]);

        return response()->json($user->fresh());
    }

    public function requestPasswordResetWhatsappLink(Request $request)
    {
        $data = $request->validate([
            'whatsapp' => ['required', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['required', 'string', 'max:50'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
        ]);

        $identifier = trim((string) $data['whatsapp']);
        $ninu = trim((string) $data['ninu']);
        $dob = substr((string) $data['date_of_birth'], 0, 10);
        $dailyKey = 'pwd-reset-whatsapp:' . preg_replace('/\D+/', '', $identifier) . ':' . now()->format('Ymd');
        if (RateLimiter::tooManyAttempts($dailyKey, 5)) {
            $this->logPasswordResetEvent($request, 'request', false, null, $identifier, 'daily_limit_reached');
            return response()->json([
                'message' => "Limite atteinte: maximum 5 demandes par jour pour ce numero.",
                'whatsapp_url' => null,
            ], 429);
        }
        RateLimiter::hit($dailyKey, 86400);

        $candidates = User::query()
            ->where(function ($query) use ($identifier) {
                $query
                    ->where('recovery_whatsapp', $identifier)
                    ->orWhere('whatsapp', $identifier)
                    ->orWhere('phone', $identifier);
            })
            ->get();

        if ($candidates->isEmpty()) {
            $this->logPasswordResetEvent($request, 'request', false, null, $identifier, 'user_not_found');
            return response()->json([
                'message' => "Si le compte existe, un lien de reinitialisation est pret.",
                'whatsapp_url' => null,
            ]);
        }

        $user = $candidates->first(function (User $candidate) use ($ninu, $dob) {
            $storedDob = $candidate->date_of_birth ? $candidate->date_of_birth->format('Y-m-d') : null;
            if (!$storedDob || !$candidate->ninu) {
                return false;
            }
            return strtolower(trim((string) $candidate->ninu)) === strtolower($ninu) && $storedDob === $dob;
        });

        if (!$user) {
            $this->logPasswordResetEvent($request, 'request', false, $user, $identifier, 'identity_mismatch');
            return response()->json([
                'message' => "Verification identite echouee. Contactez l'administration.",
                'whatsapp_url' => null,
            ], 422);
        }

        $cooldownSeconds = (int) env('PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS', 60);
        $latestRequest = PasswordResetLink::query()
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->first();
        if ($latestRequest && $latestRequest->created_at && $latestRequest->created_at->diffInSeconds(now()) < $cooldownSeconds) {
            $this->logPasswordResetEvent($request, 'request', false, $user, $identifier, 'cooldown');
            return response()->json([
                'message' => "Veuillez patienter avant de demander un nouveau lien.",
                'whatsapp_url' => null,
            ]);
        }

        $recoveryWhatsapp = trim((string) ($user->recovery_whatsapp ?: $user->whatsapp));
        if ($recoveryWhatsapp === '') {
            $this->logPasswordResetEvent($request, 'request', false, $user, $identifier, 'missing_recovery_whatsapp');
            return response()->json([
                'message' => "Aucun numero WhatsApp de recuperation configure.",
                'whatsapp_url' => null,
                'stage' => 'missing_recovery_whatsapp',
            ], 422);
        }

        $activeApproval = PasswordResetRecoveryApproval::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if ($activeApproval && $activeApproval->status === 'pending') {
            $this->logPasswordResetEvent($request, 'request', true, $user, $identifier, 'approval_pending');
            return response()->json([
                'message' => "Validation en attente sur le WhatsApp de recuperation.",
                'whatsapp_url' => null,
                'stage' => 'approval_pending',
            ]);
        }

        if ($activeApproval && $activeApproval->status === 'approved') {
            PasswordResetLink::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            $plainToken = Str::random(64);
            $tokenHash = hash('sha256', $plainToken);
            $expiryMinutes = (int) env('PASSWORD_RESET_EXPIRE_MINUTES', 15);

            PasswordResetLink::create([
                'user_id' => $user->id,
                'token_hash' => $tokenHash,
                'expires_at' => now()->addMinutes($expiryMinutes),
            ]);

            $activeApproval->update([
                'consumed_at' => now(),
            ]);

            $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
            $resetUrl = $frontendBase . '/reset-password?token=' . urlencode($plainToken);
            $target = $user->whatsapp ?: $user->phone;
            $targetDigits = preg_replace('/\D+/', '', (string) $target);
            $whatsappUrl = null;
            if ($targetDigits) {
                $text = "Bonjour {$user->name},\n\nVotre recuperation a ete approuvee.\nLien de reinitialisation:\n{$resetUrl}\n\nCe lien expire dans {$expiryMinutes} minutes.";
                $whatsappUrl = 'https://wa.me/' . $targetDigits . '?text=' . rawurlencode($text);
            }

            $this->logPasswordResetEvent($request, 'request', true, $user, $identifier, 'approved_send_reset');
            return response()->json([
                'message' => "Validation confirmee. Ouvrez WhatsApp pour envoyer le lien de reinitialisation.",
                'whatsapp_url' => $whatsappUrl,
                'expires_in_minutes' => $expiryMinutes,
                'stage' => 'approved_send_reset',
            ]);
        }

        PasswordResetRecoveryApproval::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $approvalToken = Str::random(64);
        $approvalHash = hash('sha256', $approvalToken);
        $approvalMinutes = (int) env('PASSWORD_RESET_APPROVAL_EXPIRE_MINUTES', 15);

        PasswordResetRecoveryApproval::create([
            'user_id' => $user->id,
            'token_hash' => $approvalHash,
            'status' => 'pending',
            'expires_at' => now()->addMinutes($approvalMinutes),
        ]);

        $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
        $approvalUrl = $frontendBase . '/recovery-approval?token=' . urlencode($approvalToken);
        $recoveryDigits = preg_replace('/\D+/', '', $recoveryWhatsapp);
        $whatsappUrl = null;
        if ($recoveryDigits) {
            $text = "Bonjour,\n\nDemande de recuperation pour {$user->name}.\nCliquez pour approuver ou refuser:\n{$approvalUrl}\n\nCe lien expire dans {$approvalMinutes} minutes.";
            $whatsappUrl = 'https://wa.me/' . $recoveryDigits . '?text=' . rawurlencode($text);
        }

        $this->logPasswordResetEvent($request, 'request', true, $user, $identifier, $whatsappUrl ? 'approval_requested' : 'missing_recovery_number');
        return response()->json([
            'message' => "Validation demandee au WhatsApp de recuperation.",
            'whatsapp_url' => $whatsappUrl,
            'stage' => 'approval_requested',
            'expires_in_minutes' => $approvalMinutes,
        ]);
    }

    public function resolveRecoveryApprovalToken(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $approval = PasswordResetRecoveryApproval::query()
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$approval) {
            return response()->json(['message' => 'Lien invalide.'], 422);
        }
        if ($approval->consumed_at) {
            return response()->json(['message' => 'Lien deja utilise.'], 422);
        }
        if ($approval->expires_at->isPast()) {
            return response()->json(['message' => 'Lien expire.'], 422);
        }

        $user = User::query()->find($approval->user_id);
        $targetPhone = trim((string) ($user?->whatsapp ?: $user?->phone));
        $maskedTarget = $targetPhone !== '' ? $this->maskPhone($targetPhone) : null;
        return response()->json([
            'status' => $approval->status,
            'user_name' => $user?->name,
            'target_whatsapp_masked' => $maskedTarget,
            'expires_at' => optional($approval->expires_at)->toIso8601String(),
        ]);
    }

    public function decideRecoveryApproval(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'decision' => ['required', 'in:approve,deny'],
            'target_whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $approval = PasswordResetRecoveryApproval::query()
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$approval) {
            return response()->json(['message' => 'Lien invalide.'], 422);
        }
        if ($approval->consumed_at) {
            return response()->json(['message' => 'Lien deja utilise.'], 422);
        }
        if ($approval->expires_at->isPast()) {
            return response()->json(['message' => 'Lien expire.'], 422);
        }
        if ($approval->status !== 'pending') {
            return response()->json(['message' => 'Decision deja enregistree.'], 422);
        }

        $user = User::query()->find($approval->user_id);
        if (!$user) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        if ($data['decision'] === 'approve') {
            $targetWhatsapp = trim((string) ($data['target_whatsapp'] ?? ''));
            if ($targetWhatsapp === '') {
                return response()->json(['message' => 'Numero WhatsApp du compte requis pour approuver.'], 422);
            }

            $targetDigits = preg_replace('/\D+/', '', $targetWhatsapp);
            $accountWhatsappDigits = preg_replace('/\D+/', '', (string) $user->whatsapp);
            $accountPhoneDigits = preg_replace('/\D+/', '', (string) $user->phone);
            if ($targetDigits === '' || ($targetDigits !== $accountWhatsappDigits && $targetDigits !== $accountPhoneDigits)) {
                return response()->json(['message' => 'Le numero WhatsApp ne correspond pas au compte.'], 422);
            }

            $approval->update([
                'status' => 'approved',
                'decided_at' => now(),
            ]);

            PasswordResetLink::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            $plainToken = Str::random(64);
            $tokenHash = hash('sha256', $plainToken);
            $expiryMinutes = (int) env('PASSWORD_RESET_EXPIRE_MINUTES', 15);

            PasswordResetLink::create([
                'user_id' => $user->id,
                'token_hash' => $tokenHash,
                'expires_at' => now()->addMinutes($expiryMinutes),
            ]);

            $approval->update([
                'consumed_at' => now(),
            ]);

            $frontendBase = rtrim((string) (env('APP_FRONTEND_URL') ?: $request->getSchemeAndHttpHost()), '/');
            $resetUrl = $frontendBase . '/reset-password?token=' . urlencode($plainToken);
            $text = "Bonjour {$user->name},\n\nVotre recuperation a ete approuvee.\nLien de reinitialisation:\n{$resetUrl}\n\nCe lien expire dans {$expiryMinutes} minutes.";
            $whatsappUrl = 'https://wa.me/' . $targetDigits . '?text=' . rawurlencode($text);

            $this->logPasswordResetEvent($request, 'approve', true, $user, $targetWhatsapp, 'approved_send_reset');
            return response()->json([
                'message' => 'Recuperation approuvee. Ouvrez WhatsApp pour envoyer le lien au compte utilisateur.',
                'status' => 'approved',
                'whatsapp_url' => $whatsappUrl,
                'expires_in_minutes' => $expiryMinutes,
            ]);
        }

        $approval->update([
            'status' => 'denied',
            'decided_at' => now(),
        ]);
        $approval->update([
            'consumed_at' => now(),
        ]);
        $this->logPasswordResetEvent($request, 'approve', true, $user, $user->recovery_whatsapp ?: $user->whatsapp, 'denied');
        return response()->json([
            'message' => 'Recuperation refusee.',
            'status' => 'denied',
        ]);
    }

    public function completePasswordReset(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $reset = PasswordResetLink::query()
            ->where('token_hash', $tokenHash)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$reset) {
            $this->logPasswordResetEvent($request, 'complete', false, null, null, 'invalid_or_expired_token');
            return response()->json(['message' => 'Lien invalide ou expire.'], 422);
        }

        $user = User::query()->find($reset->user_id);
        if (!$user) {
            $this->logPasswordResetEvent($request, 'complete', false, null, null, 'user_not_found');
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        $user->update([
            'password' => $data['password'],
        ]);

        $reset->update(['used_at' => now()]);
        PasswordResetLink::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('id', '!=', $reset->id)
            ->update(['used_at' => now()]);

        $this->logPasswordResetEvent($request, 'complete', true, $user, $user->whatsapp ?? $user->phone, 'password_changed');

        return response()->json(['message' => 'Mot de passe reinitialise avec succes.']);
    }

    public function resolvePasswordResetToken(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $reset = PasswordResetLink::query()
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$reset) {
            return response()->json(['message' => 'Lien invalide.'], 422);
        }
        if ($reset->used_at) {
            return response()->json(['message' => 'Ce lien a deja ete utilise.'], 422);
        }
        if ($reset->expires_at->isPast()) {
            return response()->json(['message' => 'Ce lien a expire. Demandez un nouveau lien.'], 422);
        }

        return response()->json([
            'status' => 'valid',
            'expires_at' => optional($reset->expires_at)->toIso8601String(),
        ]);
    }

    public function updateDoctorProfile(Request $request)
    {
        $doctor = $request->user();

        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu,' . $doctor->id],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'specialty' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'languages' => ['nullable', 'string', 'max:255'],
            'teleconsultation_available' => ['nullable', 'boolean'],
            'consultation_hours' => ['nullable', 'string', 'max:3000'],
            'license_number' => ['nullable', 'string', 'max:120'],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:80'],
            'consultation_fee_range' => ['nullable', 'string', 'max:120'],
            'whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'recovery_whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'bio' => ['nullable', 'string', 'max:3000'],
        ]);

        $doctor->update($data);
        $this->queueDoctorSpecialtyIfNew($doctor->specialty, $doctor->id);

        return response()->json($doctor->fresh());
    }

    public function updatePatientProfile(Request $request)
    {
        $patient = $request->user();

        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'ninu' => ['nullable', 'string', 'max:50', 'unique:users,ninu,' . $patient->id],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'recovery_whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'chronic_diseases' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'emergency_notes' => ['nullable', 'string', 'max:3000'],
            'weight_kg' => ['nullable', 'numeric', 'between:0.1,500'],
            'height_cm' => ['nullable', 'numeric', 'between:10,300'],
            'surgical_history' => ['nullable', 'string', 'max:5000'],
            'vaccination_up_to_date' => ['nullable', 'boolean'],
        ]);

        $patient->update($data);

        return response()->json($patient->fresh());
    }

    public function updateSecretaryProfile(Request $request)
    {
        $secretary = $request->user();

        if ($secretary->role !== 'secretaire') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'recovery_whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:3000'],
        ]);

        $secretary->update($data);

        return response()->json($secretary->fresh());
    }

    public function uploadDoctorProfilePhoto(Request $request)
    {
        $doctor = $request->user();
        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->uploadUserImage($request, $doctor, 'profile_photo', 'profile_photo_url', 'doctors/photos'));
    }

    public function uploadDoctorBanner(Request $request)
    {
        $doctor = $request->user();
        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->uploadUserImage($request, $doctor, 'profile_banner', 'profile_banner_url', 'doctors/banners'));
    }

    public function uploadPatientProfilePhoto(Request $request)
    {
        $patient = $request->user();
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->uploadUserImage($request, $patient, 'profile_photo', 'profile_photo_url', 'patients/photos'));
    }

    public function uploadSecretaryProfilePhoto(Request $request)
    {
        $secretary = $request->user();
        if ($secretary->role !== 'secretaire') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->uploadUserImage($request, $secretary, 'profile_photo', 'profile_photo_url', 'secretaries/photos'));
    }

    public function uploadPatientIdDocument(Request $request)
    {
        $patient = $request->user();
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return response()->json($this->uploadUserDocument($request, $patient, 'id_document', 'id_document_url', 'patients/id-documents'));
    }

    public function removePatientIdDocument(Request $request)
    {
        $patient = $request->user();
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $this->deleteIfLocalStorageUrl($patient->id_document_url);
        $patient->update(['id_document_url' => null]);

        return response()->json($patient->fresh());
    }

    public function resolveClaimToken(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:64'],
        ]);

        $tokenValue = strtoupper(trim($data['token']));

        $user = User::query()
            ->where('role', 'patient')
            ->where('claim_token', $tokenValue)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'Token invalide.'], 404);
        }
        if ($user->claimed_at) {
            return response()->json(['message' => 'Ce compte est deja reclame.'], 422);
        }
        if ($user->claim_token_expires_at && $user->claim_token_expires_at->isPast()) {
            return response()->json(['message' => 'Ce token a expire.'], 422);
        }

        $member = FamilyMember::query()
            ->where('linked_user_id', $user->id)
            ->first();

        return response()->json([
            'type' => $member ? 'family_member' : 'patient',
            'family_member_id' => $member?->id,
            'patient_user_id' => $user->id,
            'name' => $user->name,
            'date_of_birth' => $user->date_of_birth,
        ]);
    }

    public function claimFamilyMemberAccount(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:64'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'whatsapp' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
        ]);

        $tokenValue = strtoupper(trim($data['token']));

        $user = User::query()
            ->where('role', 'patient')
            ->where('claim_token', $tokenValue)
            ->first();
        if (!$user) {
            return response()->json(['message' => 'Token invalide.'], 404);
        }
        if ($user->claimed_at) {
            return response()->json(['message' => 'Ce compte est deja reclame.'], 422);
        }
        if ($user->claim_token_expires_at && $user->claim_token_expires_at->isPast()) {
            return response()->json(['message' => 'Ce token a expire.'], 422);
        }

        if ($user->account_status === 'blocked') {
            return response()->json(['message' => 'Compte bloque. Contactez un administrateur.'], 403);
        }

        $user->update([
            'email' => trim($data['email']),
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? $user->phone,
            'whatsapp' => $data['whatsapp'] ?? $user->whatsapp,
            'account_status' => 'active',
            'claimed_at' => now(),
            'claim_token' => null,
            'claim_token_expires_at' => null,
        ]);

        FamilyMember::query()
            ->where('linked_user_id', $user->id)
            ->update([
                'claimed_at' => now(),
            ]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->fresh(),
            'message' => 'Compte reclame avec succes.',
        ]);
    }
}
