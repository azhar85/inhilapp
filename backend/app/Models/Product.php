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
        'is_active',
    ];

    protected $casts = [
        'price' => 'integer',
        'is_active' => 'boolean',
        'product_images' => 'array',
        'discount_value' => 'integer',
        'stock' => 'integer',
    ];
}
