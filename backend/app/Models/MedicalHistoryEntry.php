<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalHistoryEntry extends Model
{
    protected $fillable = [
        'patient_user_id',
        'family_member_id',
        'doctor_user_id',
        'prescription_id',
        'type',
        'title',
        'details',
        'started_at',
        'ended_at',
        'status',
        'visibility',
    ];

    protected $casts = [
        'started_at' => 'date',
        'ended_at' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function familyMember()
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }
}
