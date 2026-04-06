<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetLink extends Model
{
    protected $fillable = [
        'user_id',
        'token_hash',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];
}

