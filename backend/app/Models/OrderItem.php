<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_variant_id',
        'product_name_snapshot',
        'variant_label',
        'duration_snapshot',
        'warranty_snapshot',
        'delivery_method',
        'customer_email',
        'customer_password',
        'customer_note',
        'unit_price',
        'qty',
        'line_total',
        'is_flash_sale',
    ];

    protected $casts = [
        'unit_price' => 'integer',
        'qty' => 'integer',
        'line_total' => 'integer',
        'is_flash_sale' => 'boolean',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
