<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\User;

class PrescriptionAccessEvaluator
{
    public static function canAccessAsPatient(?User $user, Prescription $prescription): bool
    {
        if (!$user || $user->role !== 'patient') {
            return false;
        }

        return $prescription->patient_user_id !== null
            && (int) $prescription->patient_user_id === (int) $user->id;
    }

    public static function canAccessAsPharmacy(?User $user, Prescription $prescription): bool
    {
        if (!$user || $user->role !== 'pharmacy') {
            return false;
        }

        return $user->pharmacy_id !== null;
    }
}
