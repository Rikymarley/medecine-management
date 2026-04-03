<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Http\Request;

class LicenseVerificationController extends Controller
{
    public function approveDoctorAccount(Request $request, User $user)
    {
        if ($user->role !== 'doctor') {
            return response()->json(['message' => 'Le compte cible doit etre un medecin.'], 422);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas approuver votre propre compte.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json([
            'id' => $user->id,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
            'verified_by_name' => $request->user()->name,
        ]);
    }

    public function unapproveDoctorAccount(Request $request, User $user)
    {
        if ($user->role !== 'doctor') {
            return response()->json(['message' => 'Le compte cible doit etre un medecin.'], 422);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas desapprouver votre propre compte.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'verification_status' => 'pending',
            'verified_at' => null,
            'verified_by' => null,
            'verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json([
            'id' => $user->id,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
            'verified_by_name' => null,
        ]);
    }

    public function approvePharmacyAccount(Request $request, User $user)
    {
        if ($user->role !== 'pharmacy') {
            return response()->json(['message' => 'Le compte cible doit etre une pharmacie.'], 422);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas approuver votre propre compte.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json([
            'id' => $user->id,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
            'verified_by_name' => $request->user()->name,
        ]);
    }

    public function unapprovePharmacyAccount(Request $request, User $user)
    {
        if ($user->role !== 'pharmacy') {
            return response()->json(['message' => 'Le compte cible doit etre une pharmacie.'], 422);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas desapprouver votre propre compte.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'verification_status' => 'pending',
            'verified_at' => null,
            'verified_by' => null,
            'verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json([
            'id' => $user->id,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
            'verified_by_name' => null,
        ]);
    }

    public function verifyDoctor(Request $request, User $doctor)
    {
        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Le compte cible doit etre un medecin.'], 422);
        }

        if ($doctor->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas verifier votre propre licence.'], 422);
        }

        $data = $request->validate([
            'verified' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $verified = $data['verified'] ?? true;

        $doctor->update([
            'license_verified' => $verified,
            'license_verified_at' => $verified ? now() : null,
            'license_verified_by_doctor_id' => $verified ? $request->user()->id : null,
            'license_verification_notes' => $data['notes'] ?? null,
        ]);

        $doctor = $doctor->fresh()->load('licenseVerifiedByDoctor:id,name');
        $row = $doctor->toArray();
        $row['license_verified_by_doctor_name'] = $doctor->licenseVerifiedByDoctor?->name;

        return response()->json($row);
    }

    public function verifyPharmacy(Request $request, Pharmacy $pharmacy)
    {
        $data = $request->validate([
            'verified' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $verified = $data['verified'] ?? true;

        $pharmacy->update([
            'license_verified' => $verified,
            'license_verified_at' => $verified ? now() : null,
            'license_verified_by_doctor_id' => $verified ? $request->user()->id : null,
            'license_verification_notes' => $data['notes'] ?? null,
        ]);

        $pharmacy = $pharmacy->fresh()->load('licenseVerifiedByDoctor:id,name');
        $row = $pharmacy->toArray();
        $row['license_verified_by_doctor_name'] = $pharmacy->licenseVerifiedByDoctor?->name;

        return response()->json($row);
    }
}
