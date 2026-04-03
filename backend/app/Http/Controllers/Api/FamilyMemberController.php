<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
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
        $members = FamilyMember::query()
            ->where('patient_user_id', $request->user()->id)
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

        $familyMember->delete();

        return response()->json(['message' => 'Membre supprime.']);
    }
}
