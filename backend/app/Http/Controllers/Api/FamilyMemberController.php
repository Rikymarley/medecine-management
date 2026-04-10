<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Prescription;
use App\Models\User;
use App\Services\DoctorPatientAccessEvaluator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FamilyMemberController extends Controller
{
    private function resolvePrincipalPatientId(User $patient): int
    {
        if (!empty($patient->principal_patient_id)) {
            return (int) $patient->principal_patient_id;
        }

        $ownerId = FamilyMember::query()
            ->where('linked_user_id', $patient->id)
            ->value('patient_user_id');

        return $ownerId ? (int) $ownerId : (int) $patient->id;
    }

    private function generateUserClaimToken(): string
    {
        do {
            $token = strtoupper(Str::random(12));
        } while (User::query()->where('claim_token', $token)->exists());

        return $token;
    }

    private function presentMember(FamilyMember $member): array
    {
        $member->loadMissing('linkedUser:id,claim_token,claim_token_expires_at,claimed_at');
        $row = $member->toArray();
        $row['claim_token'] = $member->linkedUser?->claim_token;
        $row['claim_token_expires_at'] = $member->linkedUser?->claim_token_expires_at;
        $row['claimed_at'] = $member->linkedUser?->claimed_at;
        return $row;
    }

    private function makeDependentEmail(string $name): string
    {
        $base = Str::slug($name, '.');
        if ($base === '') {
            $base = 'family.member';
        }

        do {
            $email = sprintf('%s+%s@family.local', $base, Str::lower(Str::random(8)));
        } while (User::query()->where('email', $email)->exists());

        return $email;
    }

    private function createLinkedPatientFromFamilyMember(Request $request, array $memberPayload): User
    {
        $requestUser = $request->user();
        $principalPatientId = $this->resolvePrincipalPatientId($requestUser);

        return User::query()->create([
            'name' => $memberPayload['name'],
            'email' => $this->makeDependentEmail($memberPayload['name']),
            'password' => Hash::make(Str::random(40)),
            'role' => 'patient',
            'principal_patient_id' => $principalPatientId,
            'account_status' => 'provisional',
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => $requestUser->id,
            'claim_token' => $this->generateUserClaimToken(),
            'claim_token_expires_at' => now()->addMonths(12),
            'date_of_birth' => $memberPayload['date_of_birth'] ?? null,
            'age' => $memberPayload['age'] ?? null,
            'gender' => $memberPayload['gender'] ?? null,
            'allergies' => $memberPayload['allergies'] ?? null,
            'chronic_diseases' => $memberPayload['chronic_diseases'] ?? null,
            'blood_type' => $memberPayload['blood_type'] ?? null,
            'emergency_notes' => $memberPayload['emergency_notes'] ?? null,
            'weight_kg' => $memberPayload['weight_kg'] ?? null,
            'height_cm' => $memberPayload['height_cm'] ?? null,
            'surgical_history' => $memberPayload['surgical_history'] ?? null,
            'vaccination_up_to_date' => $memberPayload['vaccination_up_to_date'] ?? null,
        ]);
    }

    private function syncLinkedUserFromFamilyMember(FamilyMember $member, array $memberPayload): void
    {
        if (!$member->linked_user_id) {
            return;
        }

        $linked = User::query()->find($member->linked_user_id);
        if (!$linked || $linked->role !== 'patient') {
            return;
        }

        $linked->update([
            'name' => $memberPayload['name'] ?? $member->name,
            'date_of_birth' => $memberPayload['date_of_birth'] ?? $member->date_of_birth,
            'age' => array_key_exists('age', $memberPayload) ? $memberPayload['age'] : $member->age,
            'gender' => $memberPayload['gender'] ?? $member->gender,
            'allergies' => $memberPayload['allergies'] ?? $member->allergies,
            'chronic_diseases' => $memberPayload['chronic_diseases'] ?? $member->chronic_diseases,
            'blood_type' => $memberPayload['blood_type'] ?? $member->blood_type,
            'emergency_notes' => $memberPayload['emergency_notes'] ?? $member->emergency_notes,
            'weight_kg' => array_key_exists('weight_kg', $memberPayload) ? $memberPayload['weight_kg'] : $member->weight_kg,
            'height_cm' => array_key_exists('height_cm', $memberPayload) ? $memberPayload['height_cm'] : $member->height_cm,
            'surgical_history' => $memberPayload['surgical_history'] ?? $member->surgical_history,
            'vaccination_up_to_date' => array_key_exists('vaccination_up_to_date', $memberPayload)
                ? $memberPayload['vaccination_up_to_date']
                : $member->vaccination_up_to_date,
            'id_document_url' => $memberPayload['id_document_url'] ?? $member->id_document_url,
        ]);
    }

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

    private function computeAgeFromDateOfBirth(?string $dateOfBirth): ?int
    {
        if (!$dateOfBirth) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($dateOfBirth)->age;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function index(Request $request)
    {
        $includeArchived = filter_var((string) $request->query('include_archived', '0'), FILTER_VALIDATE_BOOLEAN);

        $membersQuery = FamilyMember::query()
            ->where('patient_user_id', $request->user()->id);

        if (!$includeArchived) {
            $membersQuery->whereNull('archived_at');
        }

        $members = $membersQuery
            ->with('linkedUser:id,claim_token,claim_token_expires_at,claimed_at')
            ->orderBy('name')
            ->get();

        return response()->json($members->map(fn (FamilyMember $member) => $this->presentMember($member))->values());
    }

    public function indexForDoctor(Request $request, User $patient)
    {
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }

        $doctor = $request->user();
        $hasLink = DoctorPatientAccessEvaluator::hasLink($doctor->id, $patient->id);

        if (!$hasLink) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $principalPatientId = $this->resolvePrincipalPatientId($patient);
        $members = FamilyMember::query()
            ->where('patient_user_id', $principalPatientId)
            ->whereNull('archived_at')
            ->orderBy('name')
            ->get([
                'id',
                'patient_user_id',
                'linked_user_id',
                'name',
                'photo_url',
                'id_document_url',
                'archived_at',
                'age',
                'date_of_birth',
                'gender',
                'relationship',
                'allergies',
                'chronic_diseases',
                'blood_type',
                'emergency_notes',
                'weight_kg',
                'height_cm',
                'surgical_history',
                'vaccination_up_to_date',
                'primary_caregiver',
                'created_at',
                'updated_at',
            ]);

        return response()->json($members);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'gender' => ['nullable', 'in:male,female'],
            'relationship' => ['nullable', 'in:parent,spouse,child,sibling,grandparent,other'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'chronic_diseases' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'emergency_notes' => ['nullable', 'string', 'max:1500'],
            'weight_kg' => ['nullable', 'numeric', 'between:0.1,500'],
            'height_cm' => ['nullable', 'numeric', 'between:10,300'],
            'surgical_history' => ['nullable', 'string', 'max:5000'],
            'vaccination_up_to_date' => ['nullable', 'boolean'],
            'primary_caregiver' => ['sometimes', 'boolean'],
        ]);

        if (($data['primary_caregiver'] ?? false) === true) {
            FamilyMember::query()
                ->where('patient_user_id', $request->user()->id)
                ->update(['primary_caregiver' => false]);
        }

        if (array_key_exists('date_of_birth', $data)) {
            $data['age'] = $this->computeAgeFromDateOfBirth($data['date_of_birth']);
        }

        $member = DB::transaction(function () use ($request, $data) {
            $linkedUser = $this->createLinkedPatientFromFamilyMember($request, $data);

            return FamilyMember::query()->create([
                ...$data,
                'patient_user_id' => $request->user()->id,
                'linked_user_id' => $linkedUser->id,
            ]);
        });

        return response()->json($this->presentMember($member), 201);
    }

    public function update(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est deja archive.'], 422);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'gender' => ['nullable', 'in:male,female'],
            'relationship' => ['nullable', 'in:parent,spouse,child,sibling,grandparent,other'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'chronic_diseases' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'emergency_notes' => ['nullable', 'string', 'max:1500'],
            'weight_kg' => ['nullable', 'numeric', 'between:0.1,500'],
            'height_cm' => ['nullable', 'numeric', 'between:10,300'],
            'surgical_history' => ['nullable', 'string', 'max:5000'],
            'vaccination_up_to_date' => ['nullable', 'boolean'],
            'primary_caregiver' => ['sometimes', 'boolean'],
        ]);

        if (($data['primary_caregiver'] ?? false) === true) {
            FamilyMember::query()
                ->where('patient_user_id', $request->user()->id)
                ->where('id', '!=', $familyMember->id)
                ->update(['primary_caregiver' => false]);
        }

        if (array_key_exists('date_of_birth', $data)) {
            $data['age'] = $this->computeAgeFromDateOfBirth($data['date_of_birth']);
        }

        DB::transaction(function () use ($request, $familyMember, $data) {
            if (!$familyMember->linked_user_id) {
                $merged = array_merge($familyMember->toArray(), $data);
                $linkedUser = $this->createLinkedPatientFromFamilyMember($request, $merged);
                $familyMember->update(['linked_user_id' => $linkedUser->id]);
            }

            $familyMember->update($data);
            $linkedUser = User::query()->find($familyMember->linked_user_id);
            if ($linkedUser && !$linkedUser->claim_token && !$linkedUser->claimed_at) {
                $linkedUser->update([
                    'claim_token' => $this->generateUserClaimToken(),
                    'claim_token_expires_at' => now()->addMonths(12),
                ]);
            }
            $this->syncLinkedUserFromFamilyMember($familyMember->fresh(), $data);
        });

        return response()->json($this->presentMember($familyMember->fresh()));
    }

    public function destroy(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Membre deja archive.']);
        }

        $familyMember->update([
            'archived_at' => now(),
        ]);

        return response()->json(['message' => 'Membre archive.']);
    }

    public function uploadPhoto(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est archive.'], 422);
        }

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $uploaded = $request->file('photo');
        $path = $uploaded->store('family-members/photos', 'public');
        $publicUrl = $request->getSchemeAndHttpHost() . Storage::url($path);

        $this->deleteIfLocalStorageUrl($familyMember->photo_url);
        $familyMember->update(['photo_url' => $publicUrl]);
        if ($familyMember->linked_user_id) {
            User::query()->where('id', $familyMember->linked_user_id)->update([
                'profile_photo_url' => $publicUrl,
            ]);
        }

        return response()->json($this->presentMember($familyMember->fresh()));
    }

    public function removePhoto(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est archive.'], 422);
        }

        $this->deleteIfLocalStorageUrl($familyMember->photo_url);
        $familyMember->update(['photo_url' => null]);
        if ($familyMember->linked_user_id) {
            User::query()->where('id', $familyMember->linked_user_id)->update([
                'profile_photo_url' => null,
            ]);
        }

        return response()->json($this->presentMember($familyMember->fresh()));
    }

    public function uploadIdDocument(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est archive.'], 422);
        }

        $request->validate([
            'id_document' => ['required', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:4096'],
        ]);

        $file = $request->file('id_document');
        $path = $file->store('family-members/id-documents', 'public');
        $publicUrl = $request->getSchemeAndHttpHost() . Storage::url($path);

        $this->deleteIfLocalStorageUrl($familyMember->id_document_url);
        $familyMember->update(['id_document_url' => $publicUrl]);
        $this->syncLinkedUserFromFamilyMember($familyMember->fresh(), ['id_document_url' => $publicUrl]);

        return response()->json($familyMember->fresh());
    }

    public function removeIdDocument(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }
        if ($familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est archive.'], 422);
        }

        $this->deleteIfLocalStorageUrl($familyMember->id_document_url);
        $familyMember->update(['id_document_url' => null]);
        $this->syncLinkedUserFromFamilyMember($familyMember->fresh(), ['id_document_url' => null]);

        return response()->json($familyMember->fresh());
    }

    public function unarchive(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if (!$familyMember->archived_at) {
            return response()->json(['message' => 'Ce membre est deja actif.'], 422);
        }

        $familyMember->update([
            'archived_at' => null,
        ]);

        return response()->json($this->presentMember($familyMember->fresh()));
    }
}
