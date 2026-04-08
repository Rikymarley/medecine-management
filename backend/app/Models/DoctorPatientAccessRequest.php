<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DoctorPatientAccessRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_user_id',
        'doctor_user_id',
        'status',
        'message',
        'response_message',
        'responded_at',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public static function hasApprovedAccess(int $doctorId, int $patientId): bool
    {
        return self::query()
            ->where('doctor_user_id', $doctorId)
            ->where('patient_user_id', $patientId)
            ->where('status', 'approved')
            ->exists();
    }

    public static function hasPendingRequest(int $doctorId, int $patientId): bool
    {
        return self::query()
            ->where('doctor_user_id', $doctorId)
            ->where('patient_user_id', $patientId)
            ->where('status', 'pending')
            ->exists();
    }
}
