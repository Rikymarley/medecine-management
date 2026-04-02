<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;

class EmergencyContactController extends Controller
{
    public function index(Request $request)
    {
        $contacts = EmergencyContact::query()
            ->where('patient_user_id', $request->user()->id)
            ->orderBy('priority')
            ->orderByDesc('is_favorite')
            ->orderBy('name')
            ->get();

        return response()->json($contacts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'category' => ['required', 'in:hospital,clinic,laboratory,pharmacy,doctor,ambulance'],
            'city' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'available_hours' => ['nullable', 'string', 'max:120'],
            'is_24_7' => ['sometimes', 'boolean'],
            'is_favorite' => ['sometimes', 'boolean'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:3'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $contact = EmergencyContact::create([
            ...$data,
            'patient_user_id' => $request->user()->id,
            'is_24_7' => (bool) ($data['is_24_7'] ?? false),
            'is_favorite' => (bool) ($data['is_favorite'] ?? false),
        ]);

        return response()->json($contact, 201);
    }

    public function update(Request $request, EmergencyContact $emergencyContact)
    {
        if ($emergencyContact->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'category' => ['sometimes', 'required', 'in:hospital,clinic,laboratory,pharmacy,doctor,ambulance'],
            'city' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'available_hours' => ['nullable', 'string', 'max:120'],
            'is_24_7' => ['sometimes', 'boolean'],
            'is_favorite' => ['sometimes', 'boolean'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:3'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $emergencyContact->update($data);

        return response()->json($emergencyContact->fresh());
    }

    public function destroy(Request $request, EmergencyContact $emergencyContact)
    {
        if ($emergencyContact->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $emergencyContact->delete();

        return response()->json(['message' => 'Contact supprime.']);
    }
}
