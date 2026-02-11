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
                'image_url' => 'https://placehold.co/600x400/0f766e/ffffff?text=Canva+Premium',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi ganti jika akses bermasalah (3x24 jam).',
                'product_images' => [
                    'https://placehold.co/800x600/0f766e/ffffff?text=Canva+Premium+1',
                    'https://placehold.co/800x600/14b8a6/ffffff?text=Canva+Premium+2',
                ],
                'discount_type' => 'PERCENT',
                'discount_value' => 10,
            ],
            [
                'name' => 'Netflix Premium 1 Bulan',
                'description' => 'Akun Netflix Premium sharing 1 bulan.',
                'price' => 60000,
                'category' => 'Streaming',
                'image_url' => 'https://placehold.co/600x400/111827/ffffff?text=Netflix+Premium',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi login 7 hari.',
                'product_images' => [
                    'https://placehold.co/800x600/111827/ffffff?text=Netflix+Premium+1',
                    'https://placehold.co/800x600/1f2937/ffffff?text=Netflix+Premium+2',
                ],
                'discount_type' => 'FIXED',
                'discount_value' => 5000,
            ],
            [
                'name' => 'ChatGPT Plus 1 Bulan',
                'description' => 'Akses ChatGPT Plus selama 1 bulan.',
                'price' => 350000,
                'category' => 'AI',
                'image_url' => 'https://placehold.co/600x400/0ea5e9/ffffff?text=ChatGPT+Plus',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'product_images' => [
                    'https://placehold.co/800x600/0ea5e9/ffffff?text=ChatGPT+Plus+1',
                    'https://placehold.co/800x600/38bdf8/ffffff?text=ChatGPT+Plus+2',
                ],
                'discount_type' => null,
                'discount_value' => null,
            ],
            [
                'name' => 'Spotify Premium 1 Bulan',
                'description' => 'Akun Spotify Premium 1 bulan.',
                'price' => 30000,
                'category' => 'Music',
                'image_url' => 'https://placehold.co/600x400/22c55e/ffffff?text=Spotify+Premium',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'product_images' => [
                    'https://placehold.co/800x600/22c55e/ffffff?text=Spotify+Premium+1',
                ],
                'discount_type' => 'PERCENT',
                'discount_value' => 15,
            ],
            [
                'name' => 'YouTube Premium 1 Bulan',
                'description' => 'Akun YouTube Premium 1 bulan.',
                'price' => 45000,
                'category' => 'Video',
                'image_url' => 'https://placehold.co/600x400/ef4444/ffffff?text=YouTube+Premium',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'product_images' => [
                    'https://placehold.co/800x600/ef4444/ffffff?text=YouTube+Premium+1',
                ],
                'discount_type' => 'FIXED',
                'discount_value' => 3000,
            ],
            [
                'name' => 'CapCut Pro 1 Bulan',
                'description' => 'Akses CapCut Pro 1 bulan.',
                'price' => 40000,
                'category' => 'Video',
                'image_url' => 'https://placehold.co/600x400/6366f1/ffffff?text=CapCut+Pro',
                'duration' => '1 Bulan',
                'warranty' => 'Garansi akses 7 hari.',
                'product_images' => [
                    'https://placehold.co/800x600/6366f1/ffffff?text=CapCut+Pro+1',
                    'https://placehold.co/800x600/818cf8/ffffff?text=CapCut+Pro+2',
                ],
                'discount_type' => null,
                'discount_value' => null,
            ],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(
                ['slug' => Str::slug($product['name'])],
                [
                    'name' => $product['name'],
                    'description' => $product['description'],
                    'price' => $product['price'],
                    'category' => $product['category'],
                    'image_url' => $product['image_url'] ?? null,
                    'duration' => $product['duration'] ?? null,
                    'warranty' => $product['warranty'] ?? null,
                    'product_images' => $product['product_images'] ?? null,
                    'discount_type' => $product['discount_type'] ?? null,
                    'discount_value' => $product['discount_value'] ?? null,
                    'is_active' => true,
                ]
            );
        }
    }
}
