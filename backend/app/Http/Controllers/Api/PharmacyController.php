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
            'reliability_score' => ['integer', 'min:0', 'max:100']
        ]);

        $pharmacy = Pharmacy::create($data);

        return response()->json($pharmacy, 201);
    }

    public function show(Pharmacy $pharmacy)
    {
        return response()->json($pharmacy);
    }
}
