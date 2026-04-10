<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;

class HospitalController extends Controller
{
    private function presentHospital(Hospital $hospital): array
    {
        $hospital->loadMissing('licenseVerifiedByDoctor:id,name');
        $row = $hospital->toArray();
        $row['license_verified_by_doctor_name'] = $hospital->licenseVerifiedByDoctor?->name;
        $row['approved_by'] = null;
        $row['approved_at'] = null;
        $row['verified_by'] = $hospital->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $hospital->license_verified_at;
        // Keep payload shape compatible with the existing front-end directory type.
        $row['pharmacy_mode'] = 'quick_manual';
        $row['last_confirmed_stock_time'] = null;
        $row['reliability_score'] = 0;

        return $row;
    }

    public function index()
    {
        $hospitals = Hospital::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Hospital $hospital) => $this->presentHospital($hospital))
            ->values();

        return response()->json($hospitals);
    }

    public function directoryForDoctor()
    {
        $hospitals = Hospital::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Hospital $hospital) => $this->presentHospital($hospital))
            ->values();

        return response()->json($hospitals);
    }
}
