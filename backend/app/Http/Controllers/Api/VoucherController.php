<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function validateVoucher(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'subtotal' => ['required', 'integer', 'min:0'],
        ]);

        $code = strtoupper(trim($data['code']));

        $voucher = Voucher::query()
            ->where('code', $code)
            ->first();

        if (! $voucher || ! $voucher->is_active) {
            return response()->json(['message' => 'Voucher tidak valid.'], 422);
        }

        if ($voucher->starts_at && now()->lt($voucher->starts_at)) {
            return response()->json(['message' => 'Voucher belum aktif.'], 422);
        }

        if ($voucher->ends_at && now()->gt($voucher->ends_at)) {
            return response()->json(['message' => 'Voucher sudah berakhir.'], 422);
        }

        if ($voucher->min_order && $data['subtotal'] < $voucher->min_order) {
            return response()->json(['message' => 'Minimal pembelian belum terpenuhi.'], 422);
        }

        if ($voucher->usage_limit && $voucher->used_count >= $voucher->usage_limit) {
            return response()->json(['message' => 'Voucher sudah habis.'], 422);
        }

        $discount = 0;
        if ($voucher->type === 'PERCENT') {
            $discount = (int) round($data['subtotal'] * ($voucher->value / 100));
        } elseif ($voucher->type === 'FIXED') {
            $discount = $voucher->value;
        }

        if ($voucher->max_discount && $discount > $voucher->max_discount) {
            $discount = $voucher->max_discount;
        }

        if ($discount > $data['subtotal']) {
            $discount = $data['subtotal'];
        }

        $label = $voucher->type === 'PERCENT'
            ? 'Diskon ' . $voucher->value . '%'
            : 'Diskon Rp' . number_format($voucher->value, 0, ',', '.');

        return response()->json([
            'code' => $voucher->code,
            'discount_amount' => $discount,
            'final_total' => max($data['subtotal'] - $discount, 0),
            'label' => $label,
        ]);
    }
}
