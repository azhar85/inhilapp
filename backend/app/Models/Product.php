<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'category',
        'image_url',
        'duration',
        'warranty',
        'product_images',
        'discount_type',
        'discount_value',
        'stock',
        'flash_sale_active',
        'flash_sale_discount_type',
        'flash_sale_discount_value',
        'flash_sale_start_at',
        'flash_sale_end_at',
        'flash_sale_stock',
        'flash_sale_sold',
        'max_qty_per_customer',
        'is_active',
    ];

    protected $appends = [
        'flash_sale_remaining',
    ];

    protected $casts = [
        'price' => 'integer',
        'is_active' => 'boolean',
        'product_images' => 'array',
        'discount_value' => 'integer',
        'stock' => 'integer',
        'flash_sale_active' => 'boolean',
        'flash_sale_discount_value' => 'integer',
        'flash_sale_start_at' => 'datetime',
        'flash_sale_end_at' => 'datetime',
        'flash_sale_stock' => 'integer',
        'flash_sale_sold' => 'integer',
        'max_qty_per_customer' => 'integer',
    ];

    public function getFlashSaleRemainingAttribute(): ?int
    {
        if ($this->flash_sale_stock === null) {
            return null;
        }

        $sold = $this->flash_sale_sold ?? 0;
        $remaining = (int) $this->flash_sale_stock - (int) $sold;
        if ($remaining < 0) {
            return 0;
        }

        return $remaining;
    }
}
