<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Hospital extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'address',
        'latitude',
        'longitude',
        'open_now',
        'opening_hours',
        'opening_hours_json',
        'closes_at',
        'temporary_closed',
        'emergency_available',
        'last_status_updated_at',
        'services',
        'payment_methods',
        'price_range',
        'average_wait_time',
        'delivery_available',
        'delivery_radius_km',
        'night_service',
        'license_number',
        'license_verified',
        'license_verified_at',
        'license_verified_by_doctor_id',
        'license_verification_notes',
        'account_verification_status',
        'account_status',
        'can_verify_accounts',
        'account_verified_at',
        'account_verified_by',
        'account_verification_notes',
        'blocked_by',
        'blocked_at',
        'delegated_by',
        'delegated_at',
        'logo_url',
        'storefront_image_url',
        'notes_for_patients',
    ];

    protected $casts = [
        'open_now' => 'boolean',
        'opening_hours_json' => 'array',
        'temporary_closed' => 'boolean',
        'emergency_available' => 'boolean',
        'delivery_available' => 'boolean',
        'night_service' => 'boolean',
        'license_verified' => 'boolean',
        'license_verified_at' => 'datetime',
        'last_status_updated_at' => 'datetime',
        'can_verify_accounts' => 'boolean',
        'account_verified_at' => 'datetime',
        'blocked_at' => 'datetime',
        'delegated_at' => 'datetime',
        'average_wait_time' => 'integer',
        'delivery_radius_km' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function licenseVerifiedByDoctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'license_verified_by_doctor_id');
    }

    public function accountVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_verified_by');
    }

    public function delegatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_by');
    }

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by');
    }
}
