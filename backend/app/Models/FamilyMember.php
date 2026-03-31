<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = [
        'patient_user_id',
        'name',
        'age',
        'gender',
        'relationship',
        'allergies',
        'chronic_diseases',
        'blood_type',
        'emergency_notes',
        'primary_caregiver',
    ];

    protected $casts = [
        'age' => 'integer',
        'primary_caregiver' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }
}
