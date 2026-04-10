<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use App\Models\Hospital;
use App\Models\Laboratory;
use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EmergencyContactController extends Controller
{
    private function normalizeHaitiPhone(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if (!$digits) {
            return null;
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '509')) {
            $digits = substr($digits, 3);
        }

        if (strlen($digits) !== 8) {
            return null;
        }

        return sprintf('+509-%s-%s', substr($digits, 0, 4), substr($digits, 4, 4));
    }

    private function resolveProfilePayload(string $sourceType, int $sourceId): ?array
    {
        if ($sourceType === 'doctor_user') {
            $doctor = User::query()
                ->where('id', $sourceId)
                ->where('role', 'doctor')
                ->first();
            if (!$doctor) {
                return null;
            }

            $phone = $this->normalizeHaitiPhone($doctor->phone ?: $doctor->whatsapp);
            if (!$phone) {
                return null;
            }

            return [
                'name' => 'Dr. ' . $doctor->name,
                'phone' => $phone,
                'category' => 'doctor',
                'city' => $doctor->city,
                'department' => $doctor->department,
                'address' => $doctor->address,
                'available_hours' => $doctor->consultation_hours,
                'is_24_7' => false,
            ];
        }

        $facility = null;
        $category = null;
        if ($sourceType === 'pharmacy') {
            $facility = Pharmacy::query()->find($sourceId);
            $category = 'pharmacy';
        } elseif ($sourceType === 'hospital') {
            $facility = Hospital::query()->find($sourceId);
            $category = 'hospital';
        } elseif ($sourceType === 'laboratory') {
            $facility = Laboratory::query()->find($sourceId);
            $category = 'laboratory';
        }

        if (!$facility || !$category) {
            return null;
        }

        $phone = $this->normalizeHaitiPhone($facility->phone);
        if (!$phone) {
            return null;
        }

        return [
            'name' => $facility->name,
            'phone' => $phone,
            'category' => $category,
            'city' => null,
            'department' => null,
            'address' => $facility->address,
            'available_hours' => $facility->opening_hours,
            'is_24_7' => (bool) $facility->emergency_available,
        ];
    }

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
            'source_type' => ['sometimes', 'in:manual,doctor_user,pharmacy,hospital,laboratory'],
            'source_id' => ['nullable', 'integer', 'min:1'],
            'added_from_profile' => ['sometimes', 'boolean'],
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
            'source_type' => $data['source_type'] ?? 'manual',
            'source_id' => $data['source_id'] ?? null,
            'added_from_profile' => (bool) ($data['added_from_profile'] ?? false),
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
            'source_type' => ['sometimes', 'in:manual,doctor_user,pharmacy,hospital,laboratory'],
            'source_id' => ['nullable', 'integer', 'min:1'],
            'added_from_profile' => ['sometimes', 'boolean'],
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

    public function storeFromProfile(Request $request)
    {
        $data = $request->validate([
            'source_type' => ['required', 'in:doctor_user,pharmacy,hospital,laboratory'],
            'source_id' => ['required', 'integer', 'min:1'],
        ]);

        $patientId = $request->user()->id;
        $sourceType = $data['source_type'];
        $sourceId = (int) $data['source_id'];

        $profilePayload = $this->resolveProfilePayload($sourceType, $sourceId);
        if (!$profilePayload) {
            throw ValidationException::withMessages([
                'source_id' => 'Impossible de creer un contact d\'urgence depuis ce profil (telephone invalide ou profil introuvable).',
            ]);
        }

        $existing = EmergencyContact::query()
            ->where('patient_user_id', $patientId)
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->first();

        if ($existing) {
            $existing->update([
                ...$profilePayload,
                'added_from_profile' => true,
            ]);

            return response()->json([
                'message' => 'Contact d\'urgence deja existant, profil synchronise.',
                'created' => false,
                'contact' => $existing->fresh(),
            ]);
        }

        $contact = EmergencyContact::create([
            ...$profilePayload,
            'patient_user_id' => $patientId,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'added_from_profile' => true,
            'is_favorite' => false,
            'priority' => null,
            'notes' => null,
        ]);

        return response()->json([
            'message' => 'Contact d\'urgence ajoute.',
            'created' => true,
            'contact' => $contact,
        ], 201);
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
