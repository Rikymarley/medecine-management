<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pharmacy extends Model
{
    protected $fillable = [
        'name',
        'pharmacy_mode',
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
        'reliability_score',
        'services',
        'payment_methods',
        'price_range',
        'average_wait_time',
        'delivery_available',
        'delivery_radius_km',
        'night_service',
        'license_number',
        'license_verified',
        'logo_url',
        'storefront_image_url',
        'notes_for_patients',
        'last_confirmed_stock_time'
    ];

    protected $casts = [
        'open_now' => 'boolean',
        'temporary_closed' => 'boolean',
        'emergency_available' => 'boolean',
        'delivery_available' => 'boolean',
        'night_service' => 'boolean',
        'license_verified' => 'boolean',
        'last_status_updated_at' => 'datetime',
        'last_confirmed_stock_time' => 'datetime',
        'average_wait_time' => 'integer',
        'delivery_radius_km' => 'decimal:2',
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
