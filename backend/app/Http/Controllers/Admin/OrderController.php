<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

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

        $order->loadMissing('items');
        $methods = $this->orderMethods($order);
        $this->validateFulfillmentForStatus($data, $methods);

        $previousStatus = $order->status;
        $order->fill($data);
        $order->save();

        if (array_key_exists('status', $data) && $data['status'] !== $previousStatus) {
            $this->restoreStockIfNeeded($order, $data['status'], $previousStatus);
            $this->notifyCustomerStatus($order, $data['status']);
        }

        return response()->json($order);
    }

    private function validateFulfillmentForStatus(array $data, array $methods): void
    {
        if (($data['status'] ?? null) !== 'DELIVERED') {
            return;
        }

        $errors = [];
        $email = trim((string) ($data['fulfillment_email'] ?? ''));
        $password = trim((string) ($data['fulfillment_password'] ?? ''));
        $link = trim((string) ($data['fulfillment_link'] ?? ''));

        if (in_array('admin_account', $methods, true)) {
            if ($email === '') {
                $errors['fulfillment_email'][] = 'Email wajib diisi untuk metode akun admin.';
            }
            if ($password === '') {
                $errors['fulfillment_password'][] = 'Password wajib diisi untuk metode akun admin.';
            }
        }

        if (in_array('link', $methods, true) && $link === '') {
            $errors['fulfillment_link'][] = 'Link wajib diisi untuk metode link.';
        }
        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
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
        $lines[] = 'Halo ' . $order->customer_name . '👋🏻';
        if ($status === 'PAID') {
            $lines[] = 'Pembayaranmu sudah dikonfirmasi! pesananmu akan segera diproses!';
        } elseif ($status === 'DELIVERED') {
            $lines[] = 'Pesanan telah selesai! berikut detail pesananmu';
            $lines[] = '';
            $lines[] = 'ID Order: ' . ($order->order_code ?? $order->id);
            foreach ($order->items as $item) {
                $lines[] = $item->product_name_snapshot
                    . ($item->duration_snapshot ? ' (' . $item->duration_snapshot . ')' : '')
                    . ' [' . $this->methodLabel($item->delivery_method) . ']'
                    . ' x' . $item->qty;
                foreach ($this->buildDeliveredItemLines($order, $item) as $itemLine) {
                    $lines[] = $itemLine;
                }
                $lines[] = '';
            }
            if ($order->fulfillment_notes) {
                $lines[] = 'Catatan admin :';
                $lines[] = $order->fulfillment_notes;
                $lines[] = '';
            }
            $lines[] = 'Terimakasih telah order!';
        } elseif ($status === 'INVALID_PAYMENT') {
            $lines[] = 'Pembayaran tidak valid. Silakan cek kembali bukti pembayaran kamu.';
        } elseif ($status === 'REFUND') {
            $lines[] = 'Produk sedang habis. Refund akan segera diproses.';
        }

        return implode("\n", array_filter($lines, fn ($line) => $line !== null));
    }

    private function buildDeliveredItemLines(Order $order, $item): array
    {
        $lines = [];
        $method = $item->delivery_method ?? 'admin_account';

        if ($method === 'invite') {
            $lines[] = 'Email ' . $this->valueOrDash($item->customer_email) . ' berhasil di invite!';
            return $lines;
        }

        if ($method === 'own_account') {
            $lines[] = 'Email ' . $this->valueOrDash($item->customer_email) . ' berhasil di proses!';
            return $lines;
        }

        if ($method === 'link') {
            $lines[] = 'Link: ' . $this->valueOrDash($order->fulfillment_link);
            return $lines;
        }

        if ($method === 'phone') {
            $lines[] = 'Nomor HP: ' . $this->valueOrDash($item->customer_phone);
            return $lines;
        }

        $lines[] = 'Email: ' . $this->valueOrDash($order->fulfillment_email);
        $lines[] = 'Password: ' . $this->valueOrDash($order->fulfillment_password);

        return $lines;
    }

    private function valueOrDash(?string $value): string
    {
        return $value && trim($value) !== '' ? $value : '-';
    }

    private function orderMethods(Order $order): array
    {
        return $order->items
            ->pluck('delivery_method')
            ->map(fn ($method) => $method ?: 'admin_account')
            ->unique()
            ->values()
            ->all();
    }

    private function methodLabel(?string $method): string
    {
        return match ($method ?: 'admin_account') {
            'invite' => 'Invite',
            'own_account' => 'Akun Kamu',
            'link' => 'Link',
            'phone' => 'Nomor HP',
            default => 'Akun Admin',
        };
    }
}
