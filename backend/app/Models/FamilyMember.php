<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = [
        'patient_user_id',
        'name',
        'age',
        'date_of_birth',
        'gender',
        'relationship',
        'allergies',
        'chronic_diseases',
        'blood_type',
        'emergency_notes',
        'weight_kg',
        'height_cm',
        'surgical_history',
        'vaccination_up_to_date',
        'primary_caregiver',
    ];

    protected $casts = [
        'age' => 'integer',
        'date_of_birth' => 'date',
        'weight_kg' => 'float',
        'height_cm' => 'float',
        'vaccination_up_to_date' => 'boolean',
        'primary_caregiver' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }
}
