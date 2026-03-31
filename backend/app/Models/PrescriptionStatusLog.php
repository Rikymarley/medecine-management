<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionStatusLog extends Model
{
    protected $fillable = [
        'prescription_id',
        'old_status',
        'new_status',
        'changed_by_user_id',
        'reason',
        'metadata',
        'changed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'changed_at' => 'datetime',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
