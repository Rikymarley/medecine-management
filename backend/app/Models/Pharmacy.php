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
        'reliability_score'
    ];

    protected $casts = [
        'open_now' => 'boolean',
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
