<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    protected $fillable = [
        'product_id',
        'name',
        'account',
        'username',
        'password',
        'link',
        'description',
        'active_date',
        'end_date',
        'duration',
        'warranty',
        'is_active',
    ];

    protected $casts = [
        'active_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
