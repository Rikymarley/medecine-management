<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PharmacyResponse extends Model
{
    protected $fillable = [
        'pharmacy_id',
        'prescription_id',
        'medicine_request_id',
        'status',
        'responded_at',
        'expires_at'
    ];

    protected $casts = [
        'responded_at' => 'datetime',
        'expires_at' => 'datetime'
    ];

    public function pharmacy()
    {
        return $this->belongsTo(Pharmacy::class);
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicineRequest()
    {
        return $this->belongsTo(MedicineRequest::class);
    }
}
