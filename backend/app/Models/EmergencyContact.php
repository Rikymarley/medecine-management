<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmergencyContact extends Model
{
    protected $fillable = [
        'patient_user_id',
        'name',
        'phone',
        'category',
        'source_type',
        'source_id',
        'added_from_profile',
        'city',
        'department',
        'address',
        'available_hours',
        'is_24_7',
        'is_favorite',
        'priority',
        'notes',
    ];

    protected $casts = [
        'is_24_7' => 'boolean',
        'is_favorite' => 'boolean',
        'added_from_profile' => 'boolean',
        'priority' => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }
}
