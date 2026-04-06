<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RehabEntry extends Model
{
    protected $fillable = [
        'patient_user_id',
        'doctor_user_id',
        'prescription_id',
        'sessions_per_week',
        'duration_weeks',
        'goals',
        'exercise_type',
        'exercise_reps',
        'exercise_frequency',
        'exercise_notes',
        'pain_score',
        'mobility_score',
        'progress_notes',
        'follow_up_date',
    ];

    protected $casts = [
        'sessions_per_week' => 'integer',
        'duration_weeks' => 'integer',
        'pain_score' => 'integer',
        'follow_up_date' => 'date',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }
}

