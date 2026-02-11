<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_code',
        'customer_name',
        'customer_whatsapp',
        'total_amount',
        'status',
        'notes',
        'payment_proof_url',
        'payment_proof_uploaded_at',
        'fulfillment_account',
        'fulfillment_email',
        'fulfillment_password',
        'fulfillment_link',
        'fulfillment_notes',
        'voucher_code',
        'voucher_discount',
    ];

    protected $casts = [
        'total_amount' => 'integer',
        'voucher_discount' => 'integer',
        'payment_proof_uploaded_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
