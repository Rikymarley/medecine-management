<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Prescription extends Model
{
    protected $fillable = [
        'patient_name',
        'doctor_name',
        'status',
        'requested_at'
    ];

    protected $casts = [
        'requested_at' => 'datetime'
    ];

    public function medicineRequests()
    {
        return $this->hasMany(MedicineRequest::class);
    }

    public function responses()
    {
        return $this->hasMany(PharmacyResponse::class);
    }

    public function refreshStatusFromResponses(int $expireHours = 1): void
    {
        if ($this->status === 'completed') {
            return;
        }

        $hours = max(1, $expireHours);
        $requestedAt = $this->requested_at instanceof Carbon
            ? $this->requested_at
            : Carbon::parse($this->requested_at);

        if ($requestedAt->copy()->addHours($hours)->isPast()) {
            if ($this->status !== 'expired') {
                $this->update(['status' => 'expired']);
            }
            return;
        }

        $medicineRequests = $this->relationLoaded('medicineRequests')
            ? $this->medicineRequests
            : $this->medicineRequests()->get(['id']);
        $responses = $this->relationLoaded('responses')
            ? $this->responses
            : $this->responses()->get(['medicine_request_id', 'status', 'expires_at']);

        $totalMedicines = $medicineRequests->count();
        if ($totalMedicines === 0) {
            $targetStatus = 'sent_to_pharmacies';
        } else {
            $medicineIdSet = array_flip($medicineRequests->pluck('id')->all());
            $coveredMedicineIds = $responses
                ->filter(function ($response) use ($medicineIdSet) {
                    return isset($medicineIdSet[$response->medicine_request_id]) &&
                        in_array($response->status, ['very_low', 'low', 'available', 'high', 'equivalent'], true) &&
                        Carbon::parse($response->expires_at)->isFuture();
                })
                ->pluck('medicine_request_id')
                ->unique()
                ->values();

            $coveredCount = $coveredMedicineIds->count();
            if ($coveredCount === 0) {
                $targetStatus = 'sent_to_pharmacies';
            } elseif ($coveredCount < $totalMedicines) {
                $targetStatus = 'partially_available';
            } else {
                $targetStatus = 'available';
            }
        }

        if ($this->status !== $targetStatus) {
            $this->update(['status' => $targetStatus]);
        }
    }
}
