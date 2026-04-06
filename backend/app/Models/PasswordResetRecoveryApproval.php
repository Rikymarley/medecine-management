<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetRecoveryApproval extends Model
{
    protected $fillable = [
        'user_id',
        'token_hash',
        'status',
        'expires_at',
        'consumed_at',
        'decided_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
        'decided_at' => 'datetime',
    ];
}

