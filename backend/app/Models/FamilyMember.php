<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = [
        'patient_user_id',
        'name',
        'age',
        'gender',
        'relationship',
    ];

    protected $casts = [
        'age' => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }
}
