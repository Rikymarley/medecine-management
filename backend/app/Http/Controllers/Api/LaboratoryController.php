<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Laboratory;

class LaboratoryController extends Controller
{
    private function presentLaboratory(Laboratory $laboratory): array
    {
        $laboratory->loadMissing('licenseVerifiedByDoctor:id,name');
        $row = $laboratory->toArray();
        $row['license_verified_by_doctor_name'] = $laboratory->licenseVerifiedByDoctor?->name;
        $row['approved_by'] = null;
        $row['approved_at'] = null;
        $row['verified_by'] = $laboratory->licenseVerifiedByDoctor?->name;
        $row['verified_at'] = $laboratory->license_verified_at;
        // Keep payload shape compatible with the existing front-end directory type.
        $row['pharmacy_mode'] = 'quick_manual';
        $row['last_confirmed_stock_time'] = null;
        $row['reliability_score'] = 0;

        return $row;
    }

    public function index()
    {
        $laboratories = Laboratory::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Laboratory $laboratory) => $this->presentLaboratory($laboratory))
            ->values();

        return response()->json($laboratories);
    }

    public function directoryForDoctor()
    {
        $laboratories = Laboratory::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Laboratory $laboratory) => $this->presentLaboratory($laboratory))
            ->values();

        return response()->json($laboratories);
    }
}
