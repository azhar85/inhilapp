<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('fulfillment_account')->nullable()->after('notes');
            $table->string('fulfillment_link')->nullable()->after('fulfillment_account');
            $table->text('fulfillment_notes')->nullable()->after('fulfillment_link');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'fulfillment_account',
                'fulfillment_link',
                'fulfillment_notes',
            ]);
        });
    }
};
