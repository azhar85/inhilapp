<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Storage;

class SiteSettingController extends Controller
{
    public function show()
    {
        $setting = $this->getOrCreateSetting();

        return response()->json($this->normalizeSetting($setting));
    }

    private function getOrCreateSetting(): SiteSetting
    {
        return SiteSetting::first() ?? SiteSetting::create([
            'store_name' => 'InhilApp',
            'store_tagline' => 'Premium App',
        ]);
    }

    private function normalizeSetting(SiteSetting $setting): SiteSetting
    {
        $setting->logo_url = $this->normalizeMediaUrl($setting->logo_url);
        $setting->qris_url = $this->normalizeMediaUrl($setting->qris_url);

        return $setting;
    }

    private function normalizeMediaUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }
        $trimmed = trim($url);
        if ($trimmed === '') {
            return null;
        }

        $lower = strtolower($trimmed);
        if (
            str_starts_with($lower, 'http://localhost') ||
            str_starts_with($lower, 'https://localhost') ||
            str_starts_with($lower, 'http://127.0.0.1') ||
            str_starts_with($lower, 'http://0.0.0.0')
        ) {
            $path = parse_url($trimmed, PHP_URL_PATH) ?? '';
            if (str_contains($path, '/storage/')) {
                $path = substr($path, strpos($path, '/storage/') + 9);
            }
            return $this->publicUrl($path);
        }

        if (str_starts_with($trimmed, '/storage/')) {
            return $this->publicUrl(substr($trimmed, 9));
        }

        if (! preg_match('~^https?://~i', $trimmed)) {
            return $this->publicUrl($trimmed);
        }

        return $trimmed;
    }

    private function publicUrl(string $path): string
    {
        $path = ltrim($path, '/');
        $base = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
        if ($base) {
            return $base . '/storage/' . $path;
        }

        return Storage::disk('public')->url($path);
    }
}
