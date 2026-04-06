<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoctorSpecialty extends Model
{
    protected $fillable = [
        'name',
        'normalized_name',
        'status',
        'is_active',
        'sort_order',
        'created_by_user_id',
        'approved_by_user_id',
        'approved_at',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'approved_at' => 'datetime',
    ];
}

