<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use Illuminate\Http\Request;

class PharmacyController extends Controller
{
    public function index()
    {
        return response()->json(
            Pharmacy::query()
                ->whereHas('users', function ($query) {
                    $query->where('role', 'pharmacy')
                        ->where('verification_status', 'approved');
                })
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'open_now' => ['boolean'],
            'opening_hours' => ['nullable', 'string', 'max:2000'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'temporary_closed' => ['boolean'],
            'emergency_available' => ['boolean'],
            'reliability_score' => ['integer', 'min:0', 'max:100']
        ]);

        if (
            array_key_exists('open_now', $data) ||
            array_key_exists('opening_hours', $data) ||
            array_key_exists('closes_at', $data) ||
            array_key_exists('temporary_closed', $data) ||
            array_key_exists('emergency_available', $data)
        ) {
            $data['last_status_updated_at'] = now();
        }

        $pharmacy = Pharmacy::create($data);

        return response()->json($pharmacy, 201);
    }

    public function show(Pharmacy $pharmacy)
    {
        return response()->json($pharmacy);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->pharmacy_id) {
            return response()->json(['message' => 'Aucune pharmacie liee a ce compte.'], 422);
        }

        $pharmacy = Pharmacy::query()->find($user->pharmacy_id);
        if (!$pharmacy) {
            return response()->json(['message' => 'Pharmacie introuvable.'], 404);
        }

        return response()->json($pharmacy);
    }

    public function updateMe(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->pharmacy_id) {
            return response()->json(['message' => 'Aucune pharmacie liee a ce compte.'], 422);
        }

        $pharmacy = Pharmacy::query()->find($user->pharmacy_id);
        if (!$pharmacy) {
            return response()->json(['message' => 'Pharmacie introuvable.'], 404);
        }

        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'open_now' => ['sometimes', 'boolean'],
            'opening_hours' => ['nullable', 'string', 'max:2000'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'temporary_closed' => ['sometimes', 'boolean'],
            'emergency_available' => ['sometimes', 'boolean'],
        ]);

        if (
            array_key_exists('open_now', $data) ||
            array_key_exists('opening_hours', $data) ||
            array_key_exists('closes_at', $data) ||
            array_key_exists('temporary_closed', $data) ||
            array_key_exists('emergency_available', $data)
        ) {
            $data['last_status_updated_at'] = now();
        }

        $pharmacy->update($data);

        return response()->json($pharmacy->fresh());
    }
}
