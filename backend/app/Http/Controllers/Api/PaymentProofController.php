<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentProofController extends Controller
{
    public function store(Request $request, string $id)
    {
        $request->validate([
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:10240'],
        ]);

        $order = Order::with('items')->find($id);

        if (! $order) {
            return response()->json(['message' => 'Order tidak ditemukan.'], 404);
        }

        $token = env('FONNTE_TOKEN');
        $adminWa = env('FONNTE_ADMIN_WA');

        if (! $token || ! $adminWa) {
            return response()->json(['message' => 'Konfigurasi Fonnte belum lengkap.'], 500);
        }

        $file = $request->file('proof');
        $path = $file->store('payment-proofs', 'public');
        $publicUrl = $this->publicUrl($path);

        $order->payment_proof_url = $publicUrl;
        $order->payment_proof_uploaded_at = now();
        if (! $order->order_code) {
            $order->order_code = $this->generateOrderCode();
        }
        $order->save();

        $adminMessage = $this->buildAdminMessage($order, $publicUrl);
        $customerMessage = $this->buildCustomerMessage($order);

        $adminResponse = Http::withHeaders([
            'Authorization' => $token,
        ])->post('https://api.fonnte.com/send', [
            'target' => $adminWa,
            'message' => $adminMessage,
        ]);

        if (! $adminResponse->ok()) {
            return response()->json(['message' => 'Gagal mengirim bukti pembayaran.'], 502);
        }

        $adminPayload = $adminResponse->json();
        if (isset($adminPayload['status']) && $adminPayload['status'] === false) {
            return response()->json(['message' => 'Gagal mengirim bukti pembayaran.'], 502);
        }

        $customerResponse = Http::withHeaders([
            'Authorization' => $token,
        ])->post('https://api.fonnte.com/send', [
            'target' => $order->customer_whatsapp,
            'message' => $customerMessage,
        ]);

        if (! $customerResponse->ok()) {
            return response()->json([
                'message' => 'Bukti pembayaran terkirim.',
                'warning' => 'Notifikasi ke pelanggan gagal dikirim.',
                'proof_url' => $publicUrl,
                'order_code' => $order->order_code,
            ], 200);
        }

        $customerPayload = $customerResponse->json();
        if (isset($customerPayload['status']) && $customerPayload['status'] === false) {
            return response()->json([
                'message' => 'Bukti pembayaran terkirim.',
                'warning' => 'Notifikasi ke pelanggan gagal dikirim.',
                'proof_url' => $publicUrl,
                'order_code' => $order->order_code,
            ], 200);
        }

        return response()->json([
            'message' => 'Bukti pembayaran terkirim.',
            'proof_url' => $publicUrl,
            'order_code' => $order->order_code,
        ]);
    }

    private function buildAdminMessage(Order $order, string $proofUrl): string
    {
        $lines = [];
        $lines[] = 'Bukti pembayaran masuk (InhilApp).';
        $lines[] = '';
        $lines[] = 'ID Order: ' . $order->order_code;
        $lines[] = 'Nama: ' . $order->customer_name;
        $lines[] = 'WhatsApp: ' . $order->customer_whatsapp;
        $lines[] = '';
        $lines[] = 'Items:';

        foreach ($order->items as $item) {
            $lines[] = '- ' . $item->product_name_snapshot
                . ' x' . $item->qty
                . ' = Rp' . number_format($item->line_total, 0, ',', '.');
        }

        $subtotal = $order->items->sum('line_total');
        $voucherDiscount = (int) ($order->voucher_discount ?? 0);

        $lines[] = '';
        $lines[] = 'Subtotal: Rp' . number_format($subtotal, 0, ',', '.');
        if ($voucherDiscount > 0) {
            $lines[] = 'Voucher (' . ($order->voucher_code ?? '-') . '): -Rp' . number_format($voucherDiscount, 0, ',', '.');
        }
        $lines[] = 'Total: Rp' . number_format($order->total_amount, 0, ',', '.');
        $lines[] = 'Bukti pembayaran: ' . $proofUrl;

        return implode("\n", $lines);
    }

    private function buildCustomerMessage(Order $order): string
    {
        $lines = [];
        $lines[] = 'Terima kasih! Bukti pembayaran kamu sudah kami terima.';
        $lines[] = 'Pesanan akan segera diproses.';
        $lines[] = '';
        $lines[] = 'ID Order: ' . $order->order_code;
        $lines[] = 'Nama: ' . $order->customer_name;
        $lines[] = '';
        $lines[] = 'Detail Pesanan:';

        foreach ($order->items as $item) {
            $lines[] = '- ' . $item->product_name_snapshot
                . ' x' . $item->qty
                . ' = Rp' . number_format($item->line_total, 0, ',', '.');
        }

        $subtotal = $order->items->sum('line_total');
        $voucherDiscount = (int) ($order->voucher_discount ?? 0);

        $lines[] = '';
        $lines[] = 'Subtotal: Rp' . number_format($subtotal, 0, ',', '.');
        if ($voucherDiscount > 0) {
            $lines[] = 'Voucher (' . ($order->voucher_code ?? '-') . '): -Rp' . number_format($voucherDiscount, 0, ',', '.');
        }
        $lines[] = 'Total: Rp' . number_format($order->total_amount, 0, ',', '.');
        $lines[] = 'Status: akan segera diproses.';

        return implode("\n", $lines);
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

    private function publicUrl(string $path): string
    {
        $base = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
        if ($base) {
            return $base . '/storage/' . ltrim($path, '/');
        }

        return Storage::disk('public')->url($path);
    }

}
