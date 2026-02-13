<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with('items')
            ->whereNotNull('payment_proof_uploaded_at');

        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->where(function ($sub) use ($term) {
                $sub->where('order_code', 'like', "%{$term}%")
                    ->orWhere('customer_name', 'like', "%{$term}%")
                    ->orWhere('customer_whatsapp', 'like', "%{$term}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return response()->json(
            $query->orderByDesc('created_at')->get()
        );
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

    public function update(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:PENDING_PAYMENT,PAID,DELIVERED,INVALID_PAYMENT,REFUND'],
            'notes' => ['nullable', 'string'],
            'fulfillment_account' => ['nullable', 'string'],
            'fulfillment_email' => ['nullable', 'string'],
            'fulfillment_password' => ['nullable', 'string'],
            'fulfillment_link' => ['nullable', 'string'],
            'fulfillment_notes' => ['nullable', 'string'],
        ]);

        $previousStatus = $order->status;
        $order->fill($data);
        $order->save();

        if (array_key_exists('status', $data) && $data['status'] !== $previousStatus) {
            $this->restoreStockIfNeeded($order, $data['status'], $previousStatus);
            $this->notifyCustomerStatus($order, $data['status']);
        }

        return response()->json($order);
    }

    private function restoreStockIfNeeded(Order $order, string $status, string $previousStatus): void
    {
        $restoreStatuses = ['INVALID_PAYMENT', 'REFUND', 'CANCELLED'];
        if (! in_array($status, $restoreStatuses, true)) {
            return;
        }

        if ($order->stock_restored_at) {
            return;
        }

        $order->loadMissing('items.product');

        foreach ($order->items as $item) {
            $product = $item->product;
            if (! $product) {
                continue;
            }
            if ($product->stock !== null) {
                $product->increment('stock', $item->qty);
            }

            if ($item->is_flash_sale && $product->flash_sale_stock !== null) {
                $nextSold = max(($product->flash_sale_sold ?? 0) - $item->qty, 0);
                $product->flash_sale_sold = $nextSold;
                $product->save();
            }
        }

        $order->stock_restored_at = now();
        $order->save();
    }

    private function notifyCustomerStatus(Order $order, string $status): void
    {
        $token = env('FONNTE_TOKEN');
        $customerWa = $order->customer_whatsapp;

        if (! $token || ! $customerWa) {
            return;
        }

        $targetStatuses = ['PAID', 'DELIVERED', 'INVALID_PAYMENT', 'REFUND'];
        if (! in_array($status, $targetStatuses, true)) {
            return;
        }

        $order->loadMissing('items');

        $message = $this->buildCustomerStatusMessage($order, $status);
        if (! $message) {
            return;
        }

        try {
            Http::withHeaders([
                'Authorization' => $token,
            ])->post('https://api.fonnte.com/send', [
                'target' => $customerWa,
                'message' => $message,
            ]);
        } catch (\Throwable $e) {
            // Do not break admin update flow if notification fails.
        }
    }

    private function buildCustomerStatusMessage(Order $order, string $status): string
    {
        $lines = [];
        $lines[] = 'Update status pesanan InhilApp.';
        $lines[] = '';
        $lines[] = 'ID Order: ' . ($order->order_code ?? $order->id);
        $lines[] = 'Nama: ' . $order->customer_name;
        $lines[] = 'Status: ' . $this->humanStatus($status);

        if ($status === 'PAID') {
            $lines[] = '';
            $lines[] = 'Pembayaran sudah kami terima. Pesanan sedang diproses.';
            $lines[] = '';
            $lines[] = $this->buildItemsSummary($order);
        } elseif ($status === 'DELIVERED') {
            $lines[] = '';
            $lines[] = 'Pesanan sudah selesai. Berikut detail akun/link premium:';
            $lines[] = 'Akun: ' . $this->valueOrDash($order->fulfillment_account);
            $lines[] = 'Email: ' . $this->valueOrDash($order->fulfillment_email);
            $lines[] = 'Password: ' . $this->valueOrDash($order->fulfillment_password);
            $lines[] = 'Link: ' . $this->valueOrDash($order->fulfillment_link);
            if ($order->fulfillment_notes) {
                $lines[] = 'Catatan: ' . $order->fulfillment_notes;
            }
            $lines[] = '';
            $lines[] = $this->buildItemsSummary($order);
        } elseif ($status === 'INVALID_PAYMENT') {
            $lines[] = '';
            $lines[] = 'Pembayaran tidak sah. Silakan hubungi admin jika perlu bantuan.';
        } elseif ($status === 'REFUND') {
            $lines[] = '';
            $lines[] = 'Maaf, produk sedang habis. Kami akan memproses refund.';
        }

        return implode("\n", array_filter($lines, fn ($line) => $line !== null));
    }

    private function buildItemsSummary(Order $order): string
    {
        $lines = [];
        $lines[] = 'Detail pesanan:';
        foreach ($order->items as $item) {
            $lines[] = '- ' . $item->product_name_snapshot
                . ' x' . $item->qty
                . ' = Rp' . number_format($item->line_total, 0, ',', '.');
        }
        $lines[] = 'Total: Rp' . number_format($order->total_amount, 0, ',', '.');
        return implode("\n", $lines);
    }

    private function humanStatus(string $status): string
    {
        $map = [
            'PENDING_PAYMENT' => 'pending',
            'PAID' => 'paid',
            'DELIVERED' => 'delivered',
            'INVALID_PAYMENT' => 'invalid',
            'REFUND' => 'refund',
        ];

        return $map[$status] ?? strtolower(str_replace('_', ' ', $status));
    }

    private function valueOrDash(?string $value): string
    {
        return $value && trim($value) !== '' ? $value : '-';
    }
}
