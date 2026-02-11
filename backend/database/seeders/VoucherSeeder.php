<?php

namespace Database\Seeders;

use App\Models\Voucher;
use Illuminate\Database\Seeder;

class VoucherSeeder extends Seeder
{
    public function run(): void
    {
        Voucher::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'type' => 'PERCENT',
                'value' => 10,
                'max_discount' => 20000,
                'min_order' => 50000,
                'usage_limit' => 100,
                'used_count' => 0,
                'is_active' => true,
            ]
        );

        Voucher::updateOrCreate(
            ['code' => 'POTONG5'],
            [
                'type' => 'FIXED',
                'value' => 5000,
                'max_discount' => null,
                'min_order' => 30000,
                'usage_limit' => 200,
                'used_count' => 0,
                'is_active' => true,
            ]
        );
    }
}
