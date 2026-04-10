<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientMedicineCabinetItem extends Model
{
    protected $fillable = [
        'patient_user_id',
        'family_member_id',
        'patient_medicine_purchase_id',
        'prescription_id',
        'medicine_request_id',
        'pharmacy_id',
        'medication_name',
        'form',
        'dosage_strength',
        'daily_dosage',
        'quantity',
        'refill_reminder_days',
        'reminder_times_json',
        'expiration_date',
        'photo_url',
        'manufacturer',
        'requires_refrigeration',
        'note',
    ];

    protected $casts = [
        'daily_dosage' => 'integer',
        'quantity' => 'integer',
        'refill_reminder_days' => 'integer',
        'reminder_times_json' => 'array',
        'expiration_date' => 'date',
        'requires_refrigeration' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function familyMember()
    {
        return $this->belongsTo(FamilyMember::class, 'family_member_id');
    }

    public function purchase()
    {
        return $this->belongsTo(PatientMedicinePurchase::class, 'patient_medicine_purchase_id');
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
