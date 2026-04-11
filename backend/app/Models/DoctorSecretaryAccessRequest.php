<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DoctorSecretaryAccessRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_user_id',
        'secretary_user_id',
        'status',
        'message',
        'response_message',
        'responded_at',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function secretary()
    {
        return $this->belongsTo(User::class, 'secretary_user_id');
    }

    public static function hasApprovedAccess(int $doctorId, int $secretaryId): bool
    {
        return self::query()
            ->where('doctor_user_id', $doctorId)
            ->where('secretary_user_id', $secretaryId)
            ->where('status', 'approved')
            ->exists();
    }

    public static function hasPendingRequest(int $doctorId, int $secretaryId): bool
    {
        return self::query()
            ->where('doctor_user_id', $doctorId)
            ->where('secretary_user_id', $secretaryId)
            ->where('status', 'pending')
            ->exists();
    }
}

