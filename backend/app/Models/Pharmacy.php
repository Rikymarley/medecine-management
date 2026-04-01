<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pharmacy extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'address',
        'latitude',
        'longitude',
        'open_now',
        'opening_hours',
        'closes_at',
        'temporary_closed',
        'emergency_available',
        'last_status_updated_at',
        'reliability_score'
    ];

    protected $casts = [
        'open_now' => 'boolean',
        'temporary_closed' => 'boolean',
        'emergency_available' => 'boolean',
        'last_status_updated_at' => 'datetime',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7'
    ];

    public function responses()
    {
        return $this->hasMany(PharmacyResponse::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
