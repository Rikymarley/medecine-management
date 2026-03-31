<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicineRequest extends Model
{
    protected $fillable = [
        'prescription_id',
        'name',
        'strength',
        'form',
        'quantity',
        'generic_allowed',
        'conversion_allowed'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'generic_allowed' => 'boolean',
        'conversion_allowed' => 'boolean'
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function responses()
    {
        return $this->hasMany(PharmacyResponse::class);
    }
}
