<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('duration')->nullable()->after('image_url');
            $table->string('warranty')->nullable()->after('duration');
            $table->json('product_images')->nullable()->after('warranty');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['duration', 'warranty', 'product_images']);
        });
    }
};
