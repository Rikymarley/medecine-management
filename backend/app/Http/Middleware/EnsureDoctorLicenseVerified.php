<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDoctorLicenseVerified
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

        if ($user->role === 'doctor' && !$user->license_verified) {
            return response()->json([
                'message' => "Licence non verifiee. Creation d'ordonnance/historique medical indisponible.",
            ], 403);
        }

        return $next($request);
    }
}

