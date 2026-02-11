<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('account')->nullable();
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('link', 2048)->nullable();
            $table->text('description')->nullable();
            $table->date('active_date');
            $table->date('end_date');
            $table->string('duration');
            $table->string('warranty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
