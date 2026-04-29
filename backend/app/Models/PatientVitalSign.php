<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientVitalSign extends Model
{
    protected $fillable = [
        'patient_user_id',
        'family_member_id',
        'recorded_by_user_id',
        'recorded_by_role',
        'recorded_at',
        'systolic',
        'diastolic',
        'heart_rate',
        'respiratory_rate',
        'temperature_c',
        'spo2',
        'glucose_mg_dl',
        'glucose_context',
        'weight_kg',
        'height_cm',
        'pain_score',
        'measurement_context',
        'note',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'systolic' => 'integer',
        'diastolic' => 'integer',
        'heart_rate' => 'integer',
        'respiratory_rate' => 'integer',
        'temperature_c' => 'float',
        'spo2' => 'integer',
        'glucose_mg_dl' => 'integer',
        'weight_kg' => 'float',
        'height_cm' => 'float',
        'pain_score' => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function familyMember()
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}

