<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifie.'], 401);
        }

        if (
            in_array($user->role, ['doctor', 'pharmacy'], true) &&
            $user->verification_status !== 'approved'
        ) {
            return response()->json([
                'message' => 'Compte en attente de verification.',
                'verification_status' => $user->verification_status,
            ], 403);
        }

        return $next($request);
    }
}
