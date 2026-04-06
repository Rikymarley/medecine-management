<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorSpecialty;
use Illuminate\Http\JsonResponse;

class DoctorSpecialtyController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = DoctorSpecialty::query()
            ->where('status', 'approved')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($rows);
    }
}

