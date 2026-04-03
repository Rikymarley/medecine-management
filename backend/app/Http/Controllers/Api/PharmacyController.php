<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PharmacyController extends Controller
{
    private function presentPharmacy(Pharmacy $pharmacy): array
    {
        $pharmacy->loadMissing([
            'licenseVerifiedByDoctor:id,name',
            'accountUser:id,pharmacy_id,verification_status,verified_at,verified_by,verification_notes',
            'accountUser.verifiedBy:id,name',
        ]);
        $row = $pharmacy->toArray();
        $row['license_verified_by_doctor_name'] = $pharmacy->licenseVerifiedByDoctor?->name;
        $row['account_verification_status'] = $pharmacy->accountUser?->verification_status;
        $row['pharmacy_user_id'] = $pharmacy->accountUser?->id;
        $row['account_verified_at'] = $pharmacy->accountUser?->verified_at;
        $row['account_verified_by'] = $pharmacy->accountUser?->verified_by;
        $row['account_verified_by_name'] = $pharmacy->accountUser?->verifiedBy?->name;
        $row['account_verification_notes'] = $pharmacy->accountUser?->verification_notes;
        $row['approved_by'] = $pharmacy->accountUser?->verifiedBy?->name;
        $row['approved_at'] = $pharmacy->accountUser?->verified_at;
        $row['verified_by'] = $pharmacy->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $pharmacy->license_verified_at;
        return $row;
    }

    private function deleteIfLocalStorageUrl(?string $url): void
    {
        if (!$url) {
            return;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!$path || !str_starts_with($path, '/storage/')) {
            return;
        }

        $relative = ltrim(substr($path, strlen('/storage/')), '/');
        if ($relative !== '') {
            Storage::disk('public')->delete($relative);
        }
    }

    private function uploadPharmacyImage(
        Request $request,
        Pharmacy $pharmacy,
        string $requestFileKey,
        string $databaseField,
        string $directory
    ): Pharmacy
    {
        $request->validate([
            $requestFileKey => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $uploaded = $request->file($requestFileKey);
        $path = $uploaded->store($directory, 'public');
        $publicUrl = $request->getSchemeAndHttpHost() . Storage::url($path);

        $this->deleteIfLocalStorageUrl($pharmacy->{$databaseField});
        $pharmacy->update([$databaseField => $publicUrl]);

        return $pharmacy->fresh();
    }

    public function index()
    {
        $pharmacies = Pharmacy::query()
                ->with('licenseVerifiedByDoctor:id,name')
                ->whereHas('users', function ($query) {
                    $query->where('role', 'pharmacy')
                        ->where('verification_status', 'approved');
                })
                ->orderBy('name')
                ->get()
                ->map(fn (Pharmacy $pharmacy) => $this->presentPharmacy($pharmacy))
                ->values();

        return response()->json($pharmacies);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'pharmacy_mode' => ['sometimes', 'in:quick_manual,pos_integrated'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'open_now' => ['boolean'],
            'opening_hours' => ['nullable', 'string', 'max:2000'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'temporary_closed' => ['boolean'],
            'emergency_available' => ['boolean'],
            'reliability_score' => ['integer', 'min:0', 'max:100'],
            'services' => ['nullable', 'string', 'max:3000'],
            'payment_methods' => ['nullable', 'string', 'max:3000'],
            'price_range' => ['nullable', 'in:low,medium,high'],
            'average_wait_time' => ['nullable', 'integer', 'min:0', 'max:600'],
            'delivery_available' => ['sometimes', 'boolean'],
            'delivery_radius_km' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'night_service' => ['sometimes', 'boolean'],
            'license_number' => ['nullable', 'string', 'max:120'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'storefront_image_url' => ['nullable', 'url', 'max:2048'],
            'notes_for_patients' => ['nullable', 'string', 'max:500'],
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
        $data['pharmacy_mode'] = 'quick_manual';

        $pharmacy = Pharmacy::create($data);

        return response()->json($pharmacy, 201);
    }

    public function show(Pharmacy $pharmacy)
    {
        return response()->json($this->presentPharmacy($pharmacy));
    }

    public function directoryForDoctor()
    {
        $pharmacies = Pharmacy::query()
            ->with([
                'licenseVerifiedByDoctor:id,name',
                'accountUser:id,pharmacy_id,verification_status,verified_at,verified_by,verification_notes',
                'accountUser.verifiedBy:id,name',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Pharmacy $pharmacy) => $this->presentPharmacy($pharmacy))
            ->values();

        return response()->json($pharmacies);
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

        return response()->json($this->presentPharmacy($pharmacy));
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
            'pharmacy_mode' => ['sometimes', 'in:quick_manual,pos_integrated'],
            'phone' => ['nullable', 'string', 'max:14', 'regex:/^\\+509-\\d{4}-\\d{4}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'open_now' => ['sometimes', 'boolean'],
            'opening_hours' => ['nullable', 'string', 'max:2000'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'temporary_closed' => ['sometimes', 'boolean'],
            'emergency_available' => ['sometimes', 'boolean'],
            'services' => ['nullable', 'string', 'max:3000'],
            'payment_methods' => ['nullable', 'string', 'max:3000'],
            'price_range' => ['nullable', 'in:low,medium,high'],
            'average_wait_time' => ['nullable', 'integer', 'min:0', 'max:600'],
            'delivery_available' => ['sometimes', 'boolean'],
            'delivery_radius_km' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'night_service' => ['sometimes', 'boolean'],
            'license_number' => ['nullable', 'string', 'max:120'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'storefront_image_url' => ['nullable', 'url', 'max:2048'],
            'notes_for_patients' => ['nullable', 'string', 'max:500'],
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
        $data['pharmacy_mode'] = 'quick_manual';

        $pharmacy->update($data);

        return response()->json($this->presentPharmacy($pharmacy->fresh()));
    }

    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->pharmacy_id) {
            return response()->json(['message' => 'Aucune pharmacie liee a ce compte.'], 422);
        }

        $pharmacy = Pharmacy::query()->find($user->pharmacy_id);
        if (!$pharmacy) {
            return response()->json(['message' => 'Pharmacie introuvable.'], 404);
        }

        return response()->json($this->presentPharmacy($this->uploadPharmacyImage($request, $pharmacy, 'logo', 'logo_url', 'pharmacies/logos')));
    }

    public function uploadStorefrontImage(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->pharmacy_id) {
            return response()->json(['message' => 'Aucune pharmacie liee a ce compte.'], 422);
        }

        $pharmacy = Pharmacy::query()->find($user->pharmacy_id);
        if (!$pharmacy) {
            return response()->json(['message' => 'Pharmacie introuvable.'], 404);
        }

        return response()->json($this->presentPharmacy($this->uploadPharmacyImage($request, $pharmacy, 'storefront_image', 'storefront_image_url', 'pharmacies/storefronts')));
    }
}
