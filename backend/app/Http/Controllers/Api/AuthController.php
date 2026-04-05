<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    private function deleteIfLocalStorageUrl(?string $url): void
    {
        if (!$url) {
            return;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!$path || !str_starts_with($path, '/storage/')) {
            return;
        }

        $relative = ltrim(substr($path, strlen('/storage/')), '/');
        if ($relative !== '') {
            Storage::disk('public')->delete($relative);
        }
    }

    private function uploadUserImage(Request $request, User $user, string $requestFileKey, string $dbField, string $directory): User
    {
        $request->validate([
            $requestFileKey => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $uploaded = $request->file($requestFileKey);
        $path = $uploaded->store($directory, 'public');
        $publicUrl = $request->getSchemeAndHttpHost() . Storage::url($path);

        $this->deleteIfLocalStorageUrl($user->{$dbField});
        $user->update([$dbField => $publicUrl]);

        return $user->fresh();
    }

    private function uploadUserDocument(Request $request, User $user, string $requestFileKey, string $dbField, string $directory): User
    {
        $request->validate([
            $requestFileKey => ['required', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:4096'],
        ]);

        $uploaded = $request->file($requestFileKey);
        $path = $uploaded->store($directory, 'public');
        $publicUrl = $request->getSchemeAndHttpHost() . Storage::url($path);

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

    public function doctorsDirectory()
    {
        $doctors = User::query()
            ->with(['licenseVerifiedByDoctor:id,name', 'verifiedBy:id,name'])
            ->where('role', 'doctor')
            ->where('verification_status', 'approved')
            ->orderBy('name')
            ->get([
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
            ])
            ->map(fn (User $doctor) => $this->presentDoctor($doctor))
            ->values();

        return response()->json($doctors);
    }

    public function doctorsDirectoryForDoctor()
    {
        $doctors = User::query()
            ->with(['licenseVerifiedByDoctor:id,name', 'verifiedBy:id,name'])
            ->where('role', 'doctor')
            ->orderBy('name')
            ->get([
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
            ])
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
            'role' => ['required', 'in:doctor,pharmacy,patient'],
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
        $data['verification_status'] = in_array($data['role'], ['doctor', 'pharmacy'], true)
            ? 'pending'
            : 'approved';
        $data['verified_at'] = $data['verification_status'] === 'approved' ? now() : null;
        $data['can_verify_accounts'] = false;
        $data['license_verified_at'] = null;
        $data['license_verified_by_doctor_id'] = null;
        $data['license_verification_notes'] = null;

        $user = User::create($data);

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
            'bio' => ['nullable', 'string', 'max:3000'],
        ]);

        $doctor->update($data);

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
}
