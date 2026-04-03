<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanVerifyAccounts
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            !$user ||
            !in_array($user->role, ['doctor', 'pharmacy'], true) ||
            !$user->can_verify_accounts
        ) {
            return response()->json([
                'message' => 'Acces reserve aux comptes autorises a verifier les comptes.',
            ], 403);
        }

        return $next($request);
    }
}
