<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'in:doctor,pharmacy,patient'],
            'pharmacy_name' => ['nullable', 'required_if:role,pharmacy', 'string', 'max:255']
        ]);

        $pharmacyId = null;
        if ($data['role'] === 'pharmacy') {
            $pharmacy = Pharmacy::create([
                'name' => $data['pharmacy_name'],
                'open_now' => true,
                'reliability_score' => 0
            ]);
            $pharmacyId = $pharmacy->id;
        }

        unset($data['pharmacy_name']);
        $data['pharmacy_id'] = $pharmacyId;
        $data['verification_status'] = in_array($data['role'], ['doctor', 'pharmacy'], true)
            ? 'pending'
            : 'approved';
        $data['verified_at'] = $data['verification_status'] === 'approved' ? now() : null;

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
}
