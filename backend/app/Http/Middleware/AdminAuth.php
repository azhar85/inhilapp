<?php

namespace App\Http\Middleware;

use App\Models\AdminSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);

        if (! $token) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $tokenHash = hash('sha256', $token);
        $session = AdminSession::where('token_hash', $tokenHash)->first();

        if (! $session) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if ($session->expires_at && now()->gt($session->expires_at)) {
            $session->delete();
            return response()->json(['message' => 'Session expired.'], 401);
        }

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $header = $request->header('Authorization');
        if ($header && str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return $request->header('X-Admin-Token');
    }
}
