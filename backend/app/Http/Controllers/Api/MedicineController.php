<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;

class MedicineController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'in:standard,complementaire,supplementaire'],
            'is_active' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Medicine::query()->orderBy('name');

        if (!empty($data['q'])) {
            $q = trim($data['q']);
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('generic_name', 'like', "%{$q}%");
            });
        }

        if (!empty($data['category'])) {
            $query->where('category', $data['category']);
        }

        if (array_key_exists('is_active', $data)) {
            $query->where('is_active', (bool) $data['is_active']);
        }

        return response()->json($query->limit($data['limit'] ?? 50)->get());
    }

    public function show(Medicine $medicine)
    {
        return response()->json($medicine);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'generic_name' => ['nullable', 'string', 'max:255'],
            'strength' => ['nullable', 'string', 'max:80'],
            'form' => ['nullable', 'string', 'max:80'],
            'category' => ['required', 'in:standard,complementaire,supplementaire'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $medicine = Medicine::create($data);

        return response()->json($medicine, 201);
    }

    public function update(Request $request, Medicine $medicine)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'generic_name' => ['nullable', 'string', 'max:255'],
            'strength' => ['nullable', 'string', 'max:80'],
            'form' => ['nullable', 'string', 'max:80'],
            'category' => ['sometimes', 'required', 'in:standard,complementaire,supplementaire'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $medicine->update($data);

        return response()->json($medicine);
    }

    public function destroy(Medicine $medicine)
    {
        $medicine->delete();

        return response()->json(['message' => 'Medicament supprime.']);
    }
}
