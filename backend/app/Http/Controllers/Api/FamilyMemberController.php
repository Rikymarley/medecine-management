<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FamilyMemberController extends Controller
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
            ->orderBy('name')
            ->get();

        return response()->json($members);
    }

    public function indexForDoctor(Request $request, User $patient)
    {
        if ($patient->role !== 'patient') {
            return response()->json(['message' => 'Patient invalide.'], 422);
        }

        $doctor = $request->user();
        $hasLink = Prescription::query()
            ->where('doctor_user_id', $doctor->id)
            ->where('patient_user_id', $patient->id)
            ->exists();

        if (!$hasLink) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $members = FamilyMember::query()
            ->where('patient_user_id', $patient->id)
            ->whereNull('archived_at')
            ->orderBy('name')
            ->get();

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

        $member = FamilyMember::create([
            ...$data,
            'patient_user_id' => $request->user()->id,
        ]);

        return response()->json($member, 201);
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

        $familyMember->update($data);

        return response()->json($familyMember->fresh());
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

        return response()->json($familyMember->fresh());
    }
}
