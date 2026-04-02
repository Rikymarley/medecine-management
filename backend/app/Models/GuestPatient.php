<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestPatient extends Model
{
    protected $fillable = [
        'doctor_user_id',
        'name',
        'phone',
        'address',
        'age',
        'gender',
        'notes',
    ];

    protected $casts = [
        'age' => 'integer',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }
}
