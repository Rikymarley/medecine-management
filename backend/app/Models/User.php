<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'phone',
    'ninu',
    'date_of_birth',
    'address',
    'latitude',
    'longitude',
    'specialty',
    'city',
    'department',
    'languages',
    'teleconsultation_available',
    'consultation_hours',
    'license_number',
    'license_verified',
    'years_experience',
    'consultation_fee_range',
    'whatsapp',
    'bio',
    'age',
    'gender',
    'allergies',
    'chronic_diseases',
    'blood_type',
    'emergency_notes',
    'password',
    'role',
    'account_status',
    'created_by_doctor_id',
    'pharmacy_id',
    'verification_status',
    'verified_at',
    'verified_by',
    'verification_notes',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'verified_at' => 'datetime',
            'teleconsultation_available' => 'boolean',
            'license_verified' => 'boolean',
            'years_experience' => 'integer',
            'age' => 'integer',
            'date_of_birth' => 'date',
        ];
    }

    public function pharmacy()
    {
        return $this->belongsTo(Pharmacy::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(self::class, 'verified_by');
    }

    public function createdByDoctor()
    {
        return $this->belongsTo(self::class, 'created_by_doctor_id');
    }
}
