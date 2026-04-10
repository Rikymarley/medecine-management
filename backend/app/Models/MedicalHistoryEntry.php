<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalHistoryEntry extends Model
{
    protected $appends = [
        'history_code',
    ];

    protected $fillable = [
        'entry_code',
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
        'visit_id',
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

    public function prescriptions()
    {
        return $this->belongsToMany(
            Prescription::class,
            'medical_history_prescriptions',
            'medical_history_entry_id',
            'prescription_id'
        )->withTimestamps();
    }

    public function rehabEntries()
    {
        return $this->hasMany(RehabEntry::class, 'medical_history_entry_id');
    }

    public function visit()
    {
        return $this->belongsTo(Visit::class);
    }

    public function getHistoryCodeAttribute(): string
    {
        $date = optional($this->created_at)->format('Ymd') ?? now()->format('Ymd');

        return 'MH-' . $date . '-' . str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }
}
