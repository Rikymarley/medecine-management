<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetEvent extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'channel',
        'identifier_masked',
        'success',
        'reason',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'success' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
