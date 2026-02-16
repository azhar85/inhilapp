<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with('variants');

        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->where(function ($sub) use ($term) {
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('slug', 'like', "%{$term}%")
                    ->orWhere('category', 'like', "%{$term}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->toString());
        }

        if ($request->has('is_active')) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        $products = $query->orderByDesc('created_at')->get();
        $products = $products->map(fn (Product $product) => $this->normalizeProduct($product));

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, null);

        if (empty($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['name']);
        }

        if (empty($data['discount_value'])) {
            $data['discount_type'] = null;
            $data['discount_value'] = 0;
        }

        $data['is_active'] = $data['is_active'] ?? true;
        $flashFields = [
            'flash_sale_active',
            'flash_sale_discount_type',
            'flash_sale_discount_value',
            'flash_sale_start_at',
            'flash_sale_end_at',
            'flash_sale_stock',
            'flash_sale_variant_id',
            'max_qty_per_customer',
        ];
        if ($request->hasAny($flashFields)) {
            $this->normalizeFlashSale($request, $data);
        }

        if ($request->hasFile('image')) {
            $data['image_url'] = $this->storeImage($request->file('image'));
        }

        if ($request->hasFile('gallery')) {
            $data['product_images'] = $this->storeGallery($request->file('gallery'));
        }

        $product = Product::create($data);
        $variants = $this->parseVariants($request);
        if ($variants !== null) {
            $this->syncVariants($product, $variants);
        }

        $product->load('variants');
        return response()->json($this->normalizeProduct($product), 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validatePayload($request, $product->id);
        $flashFields = [
            'flash_sale_active',
            'flash_sale_discount_type',
            'flash_sale_discount_value',
            'flash_sale_start_at',
            'flash_sale_end_at',
            'flash_sale_stock',
            'flash_sale_variant_id',
            'max_qty_per_customer',
        ];

        if (isset($data['slug']) && ! $data['slug']) {
            $data['slug'] = $this->uniqueSlug($data['name'] ?? $product->name, $product->id);
        }

        if (array_key_exists('discount_value', $data) && empty($data['discount_value'])) {
            $data['discount_type'] = null;
            $data['discount_value'] = 0;
        }

        if ($request->hasAny($flashFields)) {
            $this->normalizeFlashSale($request, $data);
        } else {
            foreach ($flashFields as $field) {
                unset($data[$field]);
            }
        }

        if ($request->boolean('remove_image')) {
            $data['image_url'] = null;
        }

        if ($request->hasFile('image')) {
            $data['image_url'] = $this->storeImage($request->file('image'));
        }

        $gallery = $data['product_images'] ?? $product->product_images ?? [];
        if ($request->boolean('clear_gallery')) {
            $gallery = [];
        }

        if ($request->hasFile('gallery')) {
            $gallery = array_merge($gallery, $this->storeGallery($request->file('gallery')));
        }

        if (! empty($gallery)) {
            $data['product_images'] = array_values($gallery);
        } elseif ($request->boolean('clear_gallery')) {
            $data['product_images'] = [];
        }

        $product->fill($data);
        $product->save();
        $variants = $this->parseVariants($request);
        if ($variants !== null) {
            $this->syncVariants($product, $variants);
        }

        $product->load('variants');
        return response()->json($this->normalizeProduct($product));
    }

    public function destroy(Product $product)
    {
        $hasOrders = OrderItem::where('product_id', $product->id)->exists();

        if ($hasOrders) {
            $product->is_active = false;
            $product->save();

            return response()->json([
                'message' => 'Produk sudah dipakai di order. Produk dinonaktifkan.',
                'action' => 'deactivated',
                'product' => $product,
            ]);
        }

        $product->delete();

        return response()->json([
            'message' => 'Produk dihapus.',
            'action' => 'deleted',
        ]);
    }

    private function validatePayload(Request $request, ?int $ignoreId): array
    {
        if ($request->has('stock') && $request->input('stock') === '') {
            $request->merge(['stock' => null]);
        }
        if ($request->has('flash_sale_discount_value') && $request->input('flash_sale_discount_value') === '') {
            $request->merge(['flash_sale_discount_value' => null]);
        }
        if ($request->has('flash_sale_stock') && $request->input('flash_sale_stock') === '') {
            $request->merge(['flash_sale_stock' => null]);
        }
        if ($request->has('max_qty_per_customer') && $request->input('max_qty_per_customer') === '') {
            $request->merge(['max_qty_per_customer' => null]);
        }
        if ($request->has('flash_sale_variant_id') && $request->input('flash_sale_variant_id') === '') {
            $request->merge(['flash_sale_variant_id' => null]);
        }

        $uniqueRule = 'unique:products,slug';
        if ($ignoreId) {
            $uniqueRule .= ',' . $ignoreId;
        }

        $flashVariantRule = ['nullable', 'integer'];
        if ($ignoreId) {
            $flashVariantRule[] = Rule::exists('product_variants', 'id')
                ->where('product_id', $ignoreId);
        } else {
            $flashVariantRule[] = 'exists:product_variants,id';
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', $uniqueRule],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'integer', 'min:0'],
            'category' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'image' => ['nullable', 'image', 'max:5120'],
            'duration' => ['nullable', 'string', 'max:255'],
            'warranty' => ['nullable', 'string', 'max:255'],
            'method' => ['nullable', 'string', 'max:50'],
            'product_images' => ['nullable', 'array'],
            'product_images.*' => ['string', 'max:2048'],
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['image', 'max:5120'],
            'discount_type' => ['nullable', 'in:PERCENT,FIXED'],
            'discount_value' => ['nullable', 'integer', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'flash_sale_active' => ['nullable', 'boolean'],
            'flash_sale_discount_type' => ['nullable', 'in:PERCENT,FIXED'],
            'flash_sale_discount_value' => ['nullable', 'integer', 'min:0'],
            'flash_sale_start_at' => ['nullable', 'date'],
            'flash_sale_end_at' => ['nullable', 'date'],
            'flash_sale_variant_id' => $flashVariantRule,
            'flash_sale_stock' => ['nullable', 'integer', 'min:0'],
            'max_qty_per_customer' => ['nullable', 'integer', 'min:1'],
            'is_popular' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }

    private function normalizeFlashSale(Request $request, array &$data): void
    {
        $flashActive = $request->boolean('flash_sale_active');
        $data['flash_sale_active'] = $flashActive;

        if (! $flashActive) {
            return;
        }

        $data['flash_sale_discount_type'] = $data['flash_sale_discount_type'] ?? null;
        $data['flash_sale_discount_value'] = $data['flash_sale_discount_value'] ?? 0;
        $data['flash_sale_start_at'] = $data['flash_sale_start_at'] ?? null;
        $data['flash_sale_end_at'] = $data['flash_sale_end_at'] ?? null;
        $data['flash_sale_variant_id'] = $data['flash_sale_variant_id'] ?? null;

        if (! $data['flash_sale_discount_type'] || ! $data['flash_sale_discount_value']) {
            $data['flash_sale_active'] = false;
            $data['flash_sale_discount_type'] = null;
            $data['flash_sale_discount_value'] = null;
            $data['flash_sale_variant_id'] = null;
        }
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base ?: Str::random(6);
        $counter = 1;

        while ($this->slugExists($slug, $ignoreId)) {
            $counter++;
            $slug = $base . '-' . $counter;
        }

        return $slug;
    }

    private function slugExists(string $slug, ?int $ignoreId): bool
    {
        $query = Product::where('slug', $slug);
        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        return $query->exists();
    }

    private function storeImage($file): string
    {
        $path = $file->store('product-images', 'public');
        return $this->publicUrl($path);
    }

    private function storeGallery(array $files): array
    {
        $urls = [];
        foreach ($files as $file) {
            $urls[] = $this->storeImage($file);
        }

        return $urls;
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

        if ($product->relationLoaded('variants')) {
            $product->variants = $product->variants->map(function (ProductVariant $variant) {
                return [
                    'id' => $variant->id,
                    'label' => $variant->label,
                    'price' => $variant->price,
                    'method' => $variant->method,
                    'warranty' => $variant->warranty,
                    'stock' => $variant->stock,
                    'is_active' => (bool) $variant->is_active,
                ];
            })->values();
        }

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
        $base = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
        if ($base) {
            return $base . '/storage/' . ltrim($path, '/');
        }

        return Storage::disk('public')->url($path);
    }

    private function parseVariants(Request $request): ?array
    {
        if (! $request->has('variants')) {
            return null;
        }

        $raw = $request->input('variants');
        if ($raw === null || $raw === '') {
            return [];
        }

        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (! is_array($decoded)) {
            throw ValidationException::withMessages([
                'variants' => ['Format varian produk tidak valid.'],
            ]);
        }

        $variants = [];
        foreach ($decoded as $index => $variant) {
            if (! is_array($variant)) {
                continue;
            }
            $label = trim((string) ($variant['label'] ?? ''));
            $price = (int) ($variant['price'] ?? 0);
            $method = trim((string) ($variant['method'] ?? ''));
            $warranty = trim((string) ($variant['warranty'] ?? ''));
            $stockRaw = $variant['stock'] ?? null;
            $stock = $stockRaw === '' || $stockRaw === null ? null : (int) $stockRaw;

            if ($label === '') {
                throw ValidationException::withMessages([
                    'variants' => ["Varian #".($index + 1)." harus punya durasi/label."],
                ]);
            }

            if ($price < 0) {
                throw ValidationException::withMessages([
                    'variants' => ["Harga varian #".($index + 1)." tidak valid."],
                ]);
            }

            $variants[] = [
                'label' => $label,
                'price' => $price,
                'method' => $method !== '' ? $method : null,
                'warranty' => $warranty !== '' ? $warranty : null,
                'stock' => $stock,
                'is_active' => isset($variant['is_active']) ? (bool) $variant['is_active'] : true,
            ];
        }

        return $variants;
    }

    private function syncVariants(Product $product, array $variants): void
    {
        $product->variants()->delete();

        if (empty($variants)) {
            return;
        }

        foreach ($variants as $variant) {
            $product->variants()->create($variant);
        }
    }

}
