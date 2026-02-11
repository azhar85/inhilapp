<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name' => 'Canva Premium 1 Bulan',
                'description' => 'Akses Canva Pro full fitur selama 1 bulan.',
                'price' => 25000,
                'category' => 'Design',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi ganti jika akses bermasalah (3x24 jam).',
                'discount_type' => 'PERCENT',
                'discount_value' => 10,
            ],
            [
                'name' => 'Netflix Premium 1 Bulan',
                'description' => 'Akun Netflix Premium sharing 1 bulan.',
                'price' => 60000,
                'category' => 'Streaming',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi login 7 hari.',
                'discount_type' => 'FIXED',
                'discount_value' => 5000,
            ],
            [
                'name' => 'ChatGPT Plus 1 Bulan',
                'description' => 'Akses ChatGPT Plus selama 1 bulan.',
                'price' => 350000,
                'category' => 'AI',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'discount_type' => null,
                'discount_value' => null,
            ],
            [
                'name' => 'Spotify Premium 1 Bulan',
                'description' => 'Akun Spotify Premium 1 bulan.',
                'price' => 30000,
                'category' => 'Music',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'discount_type' => 'PERCENT',
                'discount_value' => 15,
            ],
            [
                'name' => 'YouTube Premium 1 Bulan',
                'description' => 'Akun YouTube Premium 1 bulan.',
                'price' => 45000,
                'category' => 'Video',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'discount_type' => 'FIXED',
                'discount_value' => 3000,
            ],
            [
                'name' => 'CapCut Pro 1 Bulan',
                'description' => 'Akses CapCut Pro 1 bulan.',
                'price' => 40000,
                'category' => 'Video',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'discount_type' => null,
                'discount_value' => null,
            ],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(
                ['slug' => Str::slug($product['name'])],
                $this->buildPayload($product)
            );
        }
    }

    private function buildPayload(array $product): array
    {
        $payload = [
            'name' => $product['name'],
            'description' => $product['description'],
            'price' => $product['price'],
            'category' => $product['category'],
            'duration' => $product['duration'] ?? null,
            'warranty' => $product['warranty'] ?? null,
            'discount_type' => $product['discount_type'] ?? null,
            'discount_value' => $product['discount_value'] ?? null,
            'is_active' => true,
        ];

        if (array_key_exists('image_url', $product)) {
            $payload['image_url'] = $product['image_url'];
        }

        if (array_key_exists('product_images', $product)) {
            $payload['product_images'] = $product['product_images'];
        }

        return $payload;
    }
}
