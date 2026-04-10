<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DoctorPatientBlock extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_user_id',
        'doctor_user_id',
        'blocked_at',
    ];

    protected $casts = [
        'blocked_at' => 'datetime',
    ];

    public static function isBlocked(int $doctorId, int $patientId): bool
    {
        return self::query()
            ->where('doctor_user_id', $doctorId)
            ->where('patient_user_id', $patientId)
            ->exists();
    }
}
