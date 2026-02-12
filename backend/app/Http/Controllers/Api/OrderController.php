<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request)
    {
        $data = $request->validated();
        $items = $data['items'];
        $voucherCode = $data['voucher_code'] ?? null;
        if ($voucherCode) {
            $voucherCode = strtoupper(trim($voucherCode));
        }

        return DB::transaction(function () use ($data, $items, $voucherCode) {
            $productIds = collect($items)->pluck('product_id')->unique()->values();
            $products = Product::query()
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $productIds->count()) {
                throw ValidationException::withMessages([
                    'items' => ['Produk tidak valid atau tidak aktif.'],
                ]);
            }

            $totalAmount = 0;
            $subTotal = 0;
            $orderItemsPayload = [];

            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                $qty = (int) $item['qty'];

                if ($product->stock !== null && $qty > $product->stock) {
                    throw ValidationException::withMessages([
                        'items' => ["Stok {$product->name} tidak mencukupi."],
                    ]);
                }

                $unitPrice = $this->applyDiscount($product->price, $product->discount_type, $product->discount_value);
                $lineTotal = $unitPrice * $qty;

                $orderItemsPayload[] = [
                    'product_id' => $product->id,
                    'product_name_snapshot' => $product->name,
                    'unit_price' => $unitPrice,
                    'qty' => $qty,
                    'line_total' => $lineTotal,
                ];

                $subTotal += $lineTotal;
            }

            $voucherDiscount = 0;
            $voucher = null;

            if ($voucherCode) {
                [$voucher, $voucherDiscount] = $this->resolveVoucher($voucherCode, $subTotal);
            }

            $totalAmount = max($subTotal - $voucherDiscount, 0);

            $order = Order::create([
                'order_code' => null,
                'customer_name' => $data['customer_name'],
                'customer_whatsapp' => $data['customer_whatsapp'],
                'total_amount' => $totalAmount,
                'status' => 'PENDING_PAYMENT',
                'voucher_code' => $voucher?->code,
                'voucher_discount' => $voucherDiscount,
            ]);

            if ($voucher) {
                $voucher->increment('used_count');
            }

            foreach ($orderItemsPayload as $payload) {
                $payload['order_id'] = $order->id;
                OrderItem::create($payload);
            }

            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                $qty = (int) $item['qty'];
                if ($product->stock !== null) {
                    $product->decrement('stock', $qty);
                }
            }

            return response()->json([
                'order_id' => $order->id,
                'status' => $order->status,
                'total_amount' => $order->total_amount,
                'voucher_discount' => $order->voucher_discount,
                'voucher_code' => $order->voucher_code,
            ], 201);
        });
    }

    public function show(string $id)
    {
        $order = Order::with('items')
            ->where('id', $id)
            ->orWhere('order_code', $id)
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order tidak ditemukan.'], 404);
        }

        return response()->json($order);
    }

    private function applyDiscount(int $price, ?string $type, ?int $value): int
    {
        if (! $type || ! $value || $value <= 0) {
            return $price;
        }

        $discount = 0;
        if ($type === 'PERCENT') {
            $discount = (int) round($price * ($value / 100));
        } elseif ($type === 'FIXED') {
            $discount = $value;
        }

        if ($discount < 0) {
            $discount = 0;
        }

        if ($discount > $price) {
            $discount = $price;
        }

        return $price - $discount;
    }

    private function resolveVoucher(string $code, int $subtotal): array
    {
        $voucher = Voucher::query()
            ->where('code', $code)
            ->lockForUpdate()
            ->first();

        if (! $voucher || ! $voucher->is_active) {
            throw ValidationException::withMessages([
                'voucher_code' => ['Voucher tidak valid.'],
            ]);
        }

        if ($voucher->starts_at && now()->lt($voucher->starts_at)) {
            throw ValidationException::withMessages([
                'voucher_code' => ['Voucher belum aktif.'],
            ]);
        }

        if ($voucher->ends_at && now()->gt($voucher->ends_at)) {
            throw ValidationException::withMessages([
                'voucher_code' => ['Voucher sudah berakhir.'],
            ]);
        }

        if ($voucher->min_order && $subtotal < $voucher->min_order) {
            throw ValidationException::withMessages([
                'voucher_code' => ['Minimal pembelian belum terpenuhi.'],
            ]);
        }

        if ($voucher->usage_limit && $voucher->used_count >= $voucher->usage_limit) {
            throw ValidationException::withMessages([
                'voucher_code' => ['Voucher sudah habis.'],
            ]);
        }

        $discount = 0;
        if ($voucher->type === 'PERCENT') {
            $discount = (int) round($subtotal * ($voucher->value / 100));
        } elseif ($voucher->type === 'FIXED') {
            $discount = $voucher->value;
        }

        if ($voucher->max_discount && $discount > $voucher->max_discount) {
            $discount = $voucher->max_discount;
        }

        if ($discount > $subtotal) {
            $discount = $subtotal;
        }

        return [$voucher, $discount];
    }

    private function generateOrderCode(): string
    {
        $prefix = 'APP-';

        for ($i = 0; $i < 40; $i++) {
            $code = $prefix . strtoupper(Str::random(5));
            if (! Order::where('order_code', $code)->exists()) {
                return $code;
            }
        }

        return $prefix . strtoupper(Str::random(8));
    }

}
