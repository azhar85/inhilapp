<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->where('is_active', true);

        if ($search = $request->query('q')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('category', 'like', '%' . $search . '%');
            });
        }

        $products = $query->orderBy('name')->get();

        $products = $products->map(fn (Product $product) => $this->normalizeProduct($product));

        return response()->json($products);
    }

    private function normalizeProduct(Product $product): Product
    {
        $product->image_url = $this->normalizeMediaUrl($product->image_url);
        $images = $product->product_images ?? [];
        if (! is_array($images)) {
            $images = [];
        }
        $product->product_images = array_values(array_filter(array_map(
            fn ($image) => $this->normalizeMediaUrl($image),
            $images
        )));

        return $product;
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
        return $base . '/storage/' . $path;
    }
}
