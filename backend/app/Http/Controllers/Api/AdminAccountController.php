<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\Laboratory;
use App\Models\PasswordResetEvent;
use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Http\Request;

class AdminAccountController extends Controller
{
    public function passwordResetEvents(Request $request)
    {
        $data = $request->validate([
            'action' => ['nullable', 'in:request,complete'],
            'success' => ['nullable', 'in:0,1'],
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $limit = $data['limit'] ?? 150;
        $query = PasswordResetEvent::query()
            ->with('user:id,name,role,email,phone,whatsapp')
            ->orderByDesc('id');

        if (!empty($data['action'])) {
            $query->where('action', $data['action']);
        }
        if (array_key_exists('success', $data) && $data['success'] !== null && $data['success'] !== '') {
            $query->where('success', $data['success'] === '1');
        }
        if (!empty($data['q'])) {
            $q = trim((string) $data['q']);
            $query->where(function ($inner) use ($q) {
                $inner->where('reason', 'like', '%' . $q . '%')
                    ->orWhere('identifier_masked', 'like', '%' . $q . '%')
                    ->orWhereHas('user', function ($u) use ($q) {
                        $u->where('name', 'like', '%' . $q . '%')
                            ->orWhere('email', 'like', '%' . $q . '%')
                            ->orWhere('phone', 'like', '%' . $q . '%')
                            ->orWhere('whatsapp', 'like', '%' . $q . '%');
                    });
            });
        }

        $rows = $query->limit($limit)->get()->map(function (PasswordResetEvent $event) {
            return [
                ...$event->toArray(),
                'user_name' => $event->user?->name,
                'user_role' => $event->user?->role,
                'user_email' => $event->user?->email,
            ];
        })->values();

        return response()->json($rows);
    }

    public function users(Request $request)
    {
        $data = $request->validate([
            'role' => ['nullable', 'in:doctor,pharmacy,patient,hopital,laboratoire,secretaire'],
        ]);

        $query = User::query()
            ->with([
                'verifiedBy:id,name',
                'licenseVerifiedByDoctor:id,name',
                'delegatedBy:id,name',
                'blockedBy:id,name',
                'pharmacy:id,name',
            ])
            ->whereIn('role', ['doctor', 'pharmacy', 'patient', 'hopital', 'laboratoire', 'secretaire'])
            ->orderBy('name');

        if (!empty($data['role'])) {
            $query->where('role', $data['role']);
        }

        $rows = $query->get()->map(function (User $user) {
            $row = $user->toArray();
            $row['approved_by'] = $user->verifiedBy?->name;
            $row['approved_at'] = $user->verified_at;
            $row['license_verified_by_doctor_name'] = $user->licenseVerifiedByDoctor?->name;
            $row['delegated_by_name'] = $user->delegatedBy?->name;
            $row['blocked_by_name'] = $user->blockedBy?->name;
            return $row;
        })->values();

        return response()->json($rows);
    }

    public function pharmacies()
    {
        $rows = Pharmacy::query()
            ->with([
                'licenseVerifiedByDoctor:id,name',
                'accountUser:id,name,email,pharmacy_id,account_status,verification_status,verified_at,verified_by,verification_notes,blocked_by,blocked_at,can_verify_accounts,delegated_by,delegated_at',
                'accountUser.verifiedBy:id,name',
                'accountUser.blockedBy:id,name',
                'accountUser.delegatedBy:id,name',
            ])
            ->orderBy('name')
            ->get()
            ->map(function (Pharmacy $pharmacy) {
                $row = $pharmacy->toArray();
                $row['pharmacy_user_id'] = $pharmacy->accountUser?->id;
                $row['pharmacy_user_name'] = $pharmacy->accountUser?->name;
                $row['pharmacy_user_email'] = $pharmacy->accountUser?->email;
                $row['account_verification_status'] = $pharmacy->accountUser?->verification_status;
                $row['account_status'] = $pharmacy->accountUser?->account_status;
                $row['account_can_verify_accounts'] = $pharmacy->accountUser?->can_verify_accounts;
                $row['account_verified_at'] = $pharmacy->accountUser?->verified_at;
                $row['account_verified_by'] = $pharmacy->accountUser?->verified_by;
                $row['account_verified_by_name'] = $pharmacy->accountUser?->verifiedBy?->name;
                $row['account_verification_notes'] = $pharmacy->accountUser?->verification_notes;
                $row['blocked_by'] = $pharmacy->accountUser?->blocked_by;
                $row['blocked_at'] = $pharmacy->accountUser?->blocked_at;
                $row['blocked_by_name'] = $pharmacy->accountUser?->blockedBy?->name;
                $row['delegated_by'] = $pharmacy->accountUser?->delegated_by;
                $row['delegated_at'] = $pharmacy->accountUser?->delegated_at;
                $row['delegated_by_name'] = $pharmacy->accountUser?->delegatedBy?->name;
                $row['approved_by'] = $pharmacy->accountUser?->verifiedBy?->name;
                $row['approved_at'] = $pharmacy->accountUser?->verified_at;
                $row['verified_by'] = $pharmacy->licenseVerifiedByDoctor?->name;
                $row['verified_at'] = $pharmacy->license_verified_at;
                $row['license_verified_by_doctor_name'] = $pharmacy->licenseVerifiedByDoctor?->name;
                return $row;
            })
            ->values();

        return response()->json($rows);
    }

    public function hospitals()
    {
        $rows = Hospital::query()
            ->with([
                'licenseVerifiedByDoctor:id,name',
                'accountVerifiedBy:id,name',
                'blockedBy:id,name',
                'delegatedBy:id,name',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Hospital $hospital) => $this->presentHospital($hospital))
            ->values();

        return response()->json($rows);
    }

    public function laboratories()
    {
        $rows = Laboratory::query()
            ->with([
                'licenseVerifiedByDoctor:id,name',
                'accountVerifiedBy:id,name',
                'blockedBy:id,name',
                'delegatedBy:id,name',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Laboratory $laboratory) => $this->presentLaboratory($laboratory))
            ->values();

        return response()->json($rows);
    }

    private function presentHospital(Hospital $hospital): array
    {
        $row = $hospital->toArray();
        $row['pharmacy_user_id'] = null;
        $row['pharmacy_user_name'] = null;
        $row['pharmacy_user_email'] = null;
        $row['account_can_verify_accounts'] = (bool) $hospital->can_verify_accounts;
        $row['account_verified_at'] = $hospital->account_verified_at;
        $row['account_verified_by'] = $hospital->account_verified_by;
        $row['account_verified_by_name'] = $hospital->accountVerifiedBy?->name;
        $row['blocked_by_name'] = $hospital->blockedBy?->name;
        $row['delegated_by_name'] = $hospital->delegatedBy?->name;
        $row['approved_by'] = $hospital->accountVerifiedBy?->name;
        $row['approved_at'] = $hospital->account_verified_at;
        $row['verified_by'] = $hospital->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $hospital->license_verified_at;
        $row['license_verified_by_doctor_name'] = $hospital->licenseVerifiedByDoctor?->name;
        $row['pharmacy_mode'] = 'quick_manual';
        $row['last_confirmed_stock_time'] = null;
        $row['reliability_score'] = 0;
        return $row;
    }

    private function presentLaboratory(Laboratory $laboratory): array
    {
        $row = $laboratory->toArray();
        $row['pharmacy_user_id'] = null;
        $row['pharmacy_user_name'] = null;
        $row['pharmacy_user_email'] = null;
        $row['account_can_verify_accounts'] = (bool) $laboratory->can_verify_accounts;
        $row['account_verified_at'] = $laboratory->account_verified_at;
        $row['account_verified_by'] = $laboratory->account_verified_by;
        $row['account_verified_by_name'] = $laboratory->accountVerifiedBy?->name;
        $row['blocked_by_name'] = $laboratory->blockedBy?->name;
        $row['delegated_by_name'] = $laboratory->delegatedBy?->name;
        $row['approved_by'] = $laboratory->accountVerifiedBy?->name;
        $row['approved_at'] = $laboratory->account_verified_at;
        $row['verified_by'] = $laboratory->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $laboratory->license_verified_at;
        $row['license_verified_by_doctor_name'] = $laboratory->licenseVerifiedByDoctor?->name;
        $row['pharmacy_mode'] = 'quick_manual';
        $row['last_confirmed_stock_time'] = null;
        $row['reliability_score'] = 0;
        return $row;
    }

    public function approveUser(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy', 'patient', 'hopital', 'laboratoire', 'secretaire'], true)) {
            return response()->json(['message' => 'Role utilisateur non supporte.'], 422);
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
            'role' => $user->role,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
            'verified_by_name' => $request->user()->name,
        ]);
    }

    public function unapproveUser(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy', 'patient', 'hopital', 'laboratoire', 'secretaire'], true)) {
            return response()->json(['message' => 'Role utilisateur non supporte.'], 422);
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
            'role' => $user->role,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
        ]);
    }

    public function blockUser(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy', 'patient', 'hopital', 'laboratoire', 'secretaire'], true)) {
            return response()->json(['message' => 'Role utilisateur non supporte.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->update([
            'account_status' => 'blocked',
            'verification_notes' => $data['notes'] ?? $user->verification_notes,
            'blocked_by' => $request->user()->id,
            'blocked_at' => now(),
        ]);

        return response()->json([
            'id' => $user->id,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'verification_status' => $user->verification_status,
        ]);
    }

    public function unblockUser(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy', 'patient', 'hopital', 'laboratoire', 'secretaire'], true)) {
            return response()->json(['message' => 'Role utilisateur non supporte.'], 422);
        }

        $user->update([
            'account_status' => 'active',
            'blocked_by' => null,
            'blocked_at' => null,
        ]);

        return response()->json([
            'id' => $user->id,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'verification_status' => $user->verification_status,
            'verified_at' => $user->verified_at,
            'verified_by' => $user->verified_by,
        ]);
    }

    public function verifyDoctorLicense(Request $request, User $doctor)
    {
        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Le compte cible doit etre un medecin.'], 422);
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

        $doctor->load('licenseVerifiedByDoctor:id,name');
        $row = $doctor->toArray();
        $row['license_verified_by_doctor_name'] = $doctor->licenseVerifiedByDoctor?->name;

        return response()->json($row);
    }

    public function setDoctorVerifierPermission(Request $request, User $doctor)
    {
        if ($doctor->role !== 'doctor') {
            return response()->json(['message' => 'Le compte cible doit etre un medecin.'], 422);
        }

        $data = $request->validate([
            'can_verify_accounts' => ['required', 'boolean'],
        ]);

        $doctor->update([
            'can_verify_accounts' => $data['can_verify_accounts'],
            'delegated_by' => $data['can_verify_accounts'] ? $request->user()->id : null,
            'delegated_at' => $data['can_verify_accounts'] ? now() : null,
        ]);

        return response()->json([
            'id' => $doctor->id,
            'can_verify_accounts' => (bool) $doctor->can_verify_accounts,
            'delegated_by' => $doctor->delegated_by,
            'delegated_at' => $doctor->delegated_at,
        ]);
    }

    public function setPharmacyVerifierPermission(Request $request, User $user)
    {
        if ($user->role !== 'pharmacy') {
            return response()->json(['message' => 'Le compte cible doit etre une pharmacie.'], 422);
        }

        $data = $request->validate([
            'can_verify_accounts' => ['required', 'boolean'],
        ]);

        $user->update([
            'can_verify_accounts' => $data['can_verify_accounts'],
            'delegated_by' => $data['can_verify_accounts'] ? $request->user()->id : null,
            'delegated_at' => $data['can_verify_accounts'] ? now() : null,
        ]);

        return response()->json([
            'id' => $user->id,
            'can_verify_accounts' => (bool) $user->can_verify_accounts,
            'delegated_by' => $user->delegated_by,
            'delegated_at' => $user->delegated_at,
        ]);
    }

    public function verifyPharmacyLicense(Request $request, Pharmacy $pharmacy)
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

        $pharmacy->load('licenseVerifiedByDoctor:id,name');
        $row = $pharmacy->toArray();
        $row['license_verified_by_doctor_name'] = $pharmacy->licenseVerifiedByDoctor?->name;

        return response()->json($row);
    }

    public function approveHospital(Request $request, Hospital $hospital)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $hospital->update([
            'account_verification_status' => 'approved',
            'account_verified_at' => now(),
            'account_verified_by' => $request->user()->id,
            'account_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function unapproveHospital(Request $request, Hospital $hospital)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $hospital->update([
            'account_verification_status' => 'pending',
            'account_verified_at' => null,
            'account_verified_by' => null,
            'account_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function blockHospital(Request $request, Hospital $hospital)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $hospital->update([
            'account_status' => 'blocked',
            'account_verification_notes' => $data['notes'] ?? $hospital->account_verification_notes,
            'blocked_by' => $request->user()->id,
            'blocked_at' => now(),
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function unblockHospital(Hospital $hospital)
    {
        $hospital->update([
            'account_status' => 'active',
            'blocked_by' => null,
            'blocked_at' => null,
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function setHospitalVerifierPermission(Request $request, Hospital $hospital)
    {
        $data = $request->validate([
            'can_verify_accounts' => ['required', 'boolean'],
        ]);

        $hospital->update([
            'can_verify_accounts' => $data['can_verify_accounts'],
            'delegated_by' => $data['can_verify_accounts'] ? $request->user()->id : null,
            'delegated_at' => $data['can_verify_accounts'] ? now() : null,
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function verifyHospitalLicense(Request $request, Hospital $hospital)
    {
        $data = $request->validate([
            'verified' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $verified = $data['verified'] ?? true;

        $hospital->update([
            'license_verified' => $verified,
            'license_verified_at' => $verified ? now() : null,
            'license_verified_by_doctor_id' => $verified ? $request->user()->id : null,
            'license_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentHospital($hospital->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function approveLaboratory(Request $request, Laboratory $laboratory)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $laboratory->update([
            'account_verification_status' => 'approved',
            'account_verified_at' => now(),
            'account_verified_by' => $request->user()->id,
            'account_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function unapproveLaboratory(Request $request, Laboratory $laboratory)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $laboratory->update([
            'account_verification_status' => 'pending',
            'account_verified_at' => null,
            'account_verified_by' => null,
            'account_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function blockLaboratory(Request $request, Laboratory $laboratory)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $laboratory->update([
            'account_status' => 'blocked',
            'account_verification_notes' => $data['notes'] ?? $laboratory->account_verification_notes,
            'blocked_by' => $request->user()->id,
            'blocked_at' => now(),
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function unblockLaboratory(Laboratory $laboratory)
    {
        $laboratory->update([
            'account_status' => 'active',
            'blocked_by' => null,
            'blocked_at' => null,
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function setLaboratoryVerifierPermission(Request $request, Laboratory $laboratory)
    {
        $data = $request->validate([
            'can_verify_accounts' => ['required', 'boolean'],
        ]);

        $laboratory->update([
            'can_verify_accounts' => $data['can_verify_accounts'],
            'delegated_by' => $data['can_verify_accounts'] ? $request->user()->id : null,
            'delegated_at' => $data['can_verify_accounts'] ? now() : null,
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }

    public function verifyLaboratoryLicense(Request $request, Laboratory $laboratory)
    {
        $data = $request->validate([
            'verified' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $verified = $data['verified'] ?? true;

        $laboratory->update([
            'license_verified' => $verified,
            'license_verified_at' => $verified ? now() : null,
            'license_verified_by_doctor_id' => $verified ? $request->user()->id : null,
            'license_verification_notes' => $data['notes'] ?? null,
        ]);

        return response()->json($this->presentLaboratory($laboratory->fresh([
            'licenseVerifiedByDoctor:id,name',
            'accountVerifiedBy:id,name',
            'blockedBy:id,name',
            'delegatedBy:id,name',
        ])));
    }
}
