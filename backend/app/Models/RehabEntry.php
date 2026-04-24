<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RehabEntry extends Model
{
    protected $fillable = [
        'reference',
        'patient_user_id',
        'doctor_user_id',
        'medical_history_entry_id',
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
        'visit_id',
    ];

    protected $casts = [
        'sessions_per_week' => 'integer',
        'duration_weeks' => 'integer',
        'pain_score' => 'integer',
        'follow_up_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::created(function (RehabEntry $entry): void {
            if (!empty($entry->reference)) {
                return;
            }

            $date = optional($entry->created_at)->format('Ymd') ?? now()->format('Ymd');
            $prefix = 'REH-' . $date . '-';
            $maxForDay = RehabEntry::query()
                ->where('reference', 'like', $prefix . '%')
                ->get(['reference'])
                ->reduce(static function (int $carry, RehabEntry $row) use ($prefix): int {
                    $code = (string) ($row->reference ?? '');
                    if ($code === '' || !Str::startsWith($code, $prefix)) {
                        return $carry;
                    }
                    $suffix = substr($code, strlen($prefix));
                    $numeric = ctype_digit($suffix) ? (int) $suffix : 0;
                    return max($carry, $numeric);
                }, 0);
            $entry->forceFill([
                'reference' => $prefix . str_pad((string) ($maxForDay + 1), 6, '0', STR_PAD_LEFT),
            ])->saveQuietly();
        });
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicalHistoryEntry()
    {
        return $this->belongsTo(MedicalHistoryEntry::class);
    }

    public function visit()
    {
        return $this->belongsTo(Visit::class);
    }
}
