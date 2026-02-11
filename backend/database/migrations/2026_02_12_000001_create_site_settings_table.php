<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name')->default('InhilApp');
            $table->string('store_tagline')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('qris_url')->nullable();
            $table->timestamps();
        });

        DB::table('site_settings')->insert([
            'store_name' => 'InhilApp',
            'store_tagline' => 'Premium App',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
