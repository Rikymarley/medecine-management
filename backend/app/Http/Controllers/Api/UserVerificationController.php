<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserVerificationController extends Controller
{
    public function pending(Request $request)
    {
        $data = $request->validate([
            'role' => ['nullable', 'in:doctor,pharmacy'],
        ]);

        $query = User::query()
            ->whereIn('role', ['doctor', 'pharmacy'])
            ->where('verification_status', 'pending')
            ->orderBy('created_at');

        if (!empty($data['role'])) {
            $query->where('role', $data['role']);
        }

        return response()->json($query->get());
    }

    public function approve(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy'], true)) {
            return response()->json(['message' => 'Seuls les comptes medecin/pharmacie peuvent etre verifies.'], 422);
        }

        $user->update([
            'verification_status' => 'approved',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'verification_notes' => $request->input('notes'),
        ]);

        return response()->json($user);
    }

    public function reject(Request $request, User $user)
    {
        if (!in_array($user->role, ['doctor', 'pharmacy'], true)) {
            return response()->json(['message' => 'Seuls les comptes medecin/pharmacie peuvent etre verifies.'], 422);
        }

        $data = $request->validate([
            'notes' => ['required', 'string', 'max:2000'],
        ]);

        $user->update([
            'verification_status' => 'rejected',
            'verified_at' => null,
            'verified_by' => $request->user()->id,
            'verification_notes' => $data['notes'],
        ]);

        return response()->json($user);
    }
}
