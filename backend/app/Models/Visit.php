<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Visit extends Model
{
    protected $fillable = [
        'patient_user_id',
        'family_member_id',
        'doctor_user_id',
        'visit_date',
        'visit_type',
        'chief_complaint',
        'diagnosis',
        'clinical_notes',
        'treatment_plan',
        'status',
    ];

    protected $casts = [
        'visit_date' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function familyMember()
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function medicalHistoryEntries()
    {
        return $this->hasMany(MedicalHistoryEntry::class);
    }

    public function rehabEntries()
    {
        return $this->hasMany(RehabEntry::class);
    }
}
