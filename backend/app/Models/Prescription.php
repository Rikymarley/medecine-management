<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Prescription extends Model
{
    protected $fillable = [
        'doctor_user_id',
        'patient_user_id',
        'family_member_id',
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

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function familyMember()
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function responses()
    {
        return $this->hasMany(PharmacyResponse::class);
    }

    public function statusLogs()
    {
        return $this->hasMany(PrescriptionStatusLog::class);
    }

    public function changeStatus(
        string $newStatus,
        ?int $changedByUserId = null,
        ?string $reason = null,
        ?array $metadata = null
    ): void {
        $oldStatus = $this->status;
        if ($oldStatus === $newStatus) {
            return;
        }

        $this->update(['status' => $newStatus]);

        $this->statusLogs()->create([
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by_user_id' => $changedByUserId,
            'reason' => $reason,
            'metadata' => $metadata,
            'changed_at' => now(),
        ]);
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
            $this->changeStatus('expired', null, 'auto_expiration_check');
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

        $this->changeStatus($targetStatus, null, 'auto_response_refresh');
    }
}
