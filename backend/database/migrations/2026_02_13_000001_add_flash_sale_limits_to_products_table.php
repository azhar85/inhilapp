<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('flash_sale_stock')->nullable()->after('flash_sale_end_at');
            $table->integer('flash_sale_sold')->default(0)->after('flash_sale_stock');
            $table->integer('max_qty_per_customer')->nullable()->after('flash_sale_sold');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'flash_sale_stock',
                'flash_sale_sold',
                'max_qty_per_customer',
            ]);
        });
    }
};
