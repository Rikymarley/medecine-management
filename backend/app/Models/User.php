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
    'can_verify_accounts',
    'delegated_by',
    'delegated_at',
    'license_verified_at',
    'license_verified_by_doctor_id',
    'license_verification_notes',
    'years_experience',
    'consultation_fee_range',
    'whatsapp',
    'recovery_whatsapp',
    'bio',
    'profile_photo_url',
    'profile_banner_url',
    'id_document_url',
    'claim_token',
    'claim_token_expires_at',
    'claimed_at',
    'age',
    'gender',
    'allergies',
    'chronic_diseases',
    'blood_type',
    'emergency_notes',
    'weight_kg',
    'height_cm',
    'surgical_history',
    'vaccination_up_to_date',
    'password',
    'role',
    'account_status',
    'blocked_by',
    'blocked_at',
    'created_by_doctor_id',
    'principal_patient_id',
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
            'can_verify_accounts' => 'boolean',
            'delegated_at' => 'datetime',
            'license_verified_at' => 'datetime',
            'years_experience' => 'integer',
            'age' => 'integer',
            'date_of_birth' => 'date',
            'weight_kg' => 'float',
            'height_cm' => 'float',
            'vaccination_up_to_date' => 'boolean',
            'blocked_at' => 'datetime',
            'claim_token_expires_at' => 'datetime',
            'claimed_at' => 'datetime',
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

    public function licenseVerifiedByDoctor()
    {
        return $this->belongsTo(self::class, 'license_verified_by_doctor_id');
    }

    public function principalPatient()
    {
        return $this->belongsTo(self::class, 'principal_patient_id');
    }

    public function delegatedBy()
    {
        return $this->belongsTo(self::class, 'delegated_by');
    }

    public function blockedBy()
    {
        return $this->belongsTo(self::class, 'blocked_by');
    }
}
