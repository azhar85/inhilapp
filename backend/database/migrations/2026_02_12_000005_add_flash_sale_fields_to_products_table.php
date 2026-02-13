<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('flash_sale_active')->default(false)->after('stock');
            $table->string('flash_sale_discount_type')->nullable()->after('flash_sale_active');
            $table->integer('flash_sale_discount_value')->nullable()->after('flash_sale_discount_type');
            $table->timestamp('flash_sale_start_at')->nullable()->after('flash_sale_discount_value');
            $table->timestamp('flash_sale_end_at')->nullable()->after('flash_sale_start_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'flash_sale_active',
                'flash_sale_discount_type',
                'flash_sale_discount_value',
                'flash_sale_start_at',
                'flash_sale_end_at',
            ]);
        });
    }
};
