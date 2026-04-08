<?php

namespace App\Services;

use App\Models\DoctorPatientAccessRequest;
use App\Models\Prescription;
use App\Models\User;

class DoctorPatientAccessEvaluator
{
    public static function hasLink(int $doctorId, int $patientId): bool
    {
        if (!User::query()->where('id', $patientId)->where('role', 'patient')->exists()) {
            return false;
        }

        if (User::query()->where('id', $patientId)->where('created_by_doctor_id', $doctorId)->exists()) {
            return true;
        }

        if (Prescription::query()->where('doctor_user_id', $doctorId)->where('patient_user_id', $patientId)->exists()) {
            return true;
        }

        return DoctorPatientAccessRequest::hasApprovedAccess($doctorId, $patientId);
    }
}
