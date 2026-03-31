<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientMedicinePurchase extends Model
{
    protected $fillable = [
        'patient_user_id',
        'prescription_id',
        'medicine_request_id',
        'pharmacy_id',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicineRequest()
    {
        return $this->belongsTo(MedicineRequest::class);
    }

    public function pharmacy()
    {
        return $this->belongsTo(Pharmacy::class);
    }
}
