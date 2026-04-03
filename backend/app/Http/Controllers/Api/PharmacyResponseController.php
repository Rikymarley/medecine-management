<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy;
use App\Models\Prescription;
use App\Models\PharmacyResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PharmacyResponseController extends Controller
{
    private function expireHours(): int
    {
        return max(1, (int) env('PRESCRIPTION_EXPIRE_HOURS', 1));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'pharmacy_id' => ['required', 'exists:pharmacies,id'],
            'prescription_id' => ['required', 'exists:prescriptions,id'],
            'medicine_request_id' => ['required', 'exists:medicine_requests,id'],
            'status' => ['required', 'in:out_of_stock,very_low,low,available,high,equivalent,not_available'],
            'expires_at_minutes' => ['required', 'integer', 'min:5', 'max:120']
        ]);

        $user = $request->user();
        if ($user && $user->pharmacy_id && (int) $user->pharmacy_id !== (int) $data['pharmacy_id']) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $pharmacy = Pharmacy::query()->find($data['pharmacy_id']);
        if (!$pharmacy) {
            return response()->json(['message' => 'Pharmacie introuvable.'], 404);
        }
        if ($pharmacy->latitude === null || $pharmacy->longitude === null) {
            return response()->json([
                'message' => 'GPS requis: veuillez renseigner latitude et longitude de la pharmacie avant de confirmer une disponibilite.'
            ], 422);
        }

        $response = PharmacyResponse::create([
            'pharmacy_id' => $data['pharmacy_id'],
            'prescription_id' => $data['prescription_id'],
            'medicine_request_id' => $data['medicine_request_id'],
            'status' => $data['status'],
            'responded_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addMinutes($data['expires_at_minutes'])
        ]);

        $pharmacy->update(['last_confirmed_stock_time' => Carbon::now()]);

        $prescription = Prescription::query()
            ->with(['medicineRequests', 'responses'])
            ->find($data['prescription_id']);
        if ($prescription) {
            $prescription->refreshStatusFromResponses($this->expireHours());
        }

        return response()->json($response, 201);
    }
}
