<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->after('product_id');
            $table->string('variant_label')->nullable()->after('product_name_snapshot');
            $table->string('duration_snapshot')->nullable()->after('variant_label');
            $table->string('warranty_snapshot')->nullable()->after('duration_snapshot');
            $table->string('delivery_method')->nullable()->after('warranty_snapshot');
            $table->string('customer_email')->nullable()->after('delivery_method');
            $table->string('customer_password')->nullable()->after('customer_email');
            $table->text('customer_note')->nullable()->after('customer_password');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn([
                'product_variant_id',
                'variant_label',
                'duration_snapshot',
                'warranty_snapshot',
                'delivery_method',
                'customer_email',
                'customer_password',
                'customer_note',
            ]);
        });
    }
};
