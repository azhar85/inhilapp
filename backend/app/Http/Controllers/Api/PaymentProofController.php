<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentProofController extends Controller
{
    public function store(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:10240'],
            'item_details' => ['nullable'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first() ?: 'Data tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $token = env('FONNTE_TOKEN');
        $adminWa = env('FONNTE_ADMIN_WA');

        if (! $token || ! $adminWa) {
            return response()->json(['message' => 'Konfigurasi Fonnte belum lengkap.'], 500);
        }

        $orderExists = Order::find($id);
        if (! $orderExists) {
            return response()->json(['message' => 'Order tidak ditemukan.'], 404);
        }

        $file = $request->file('proof');
        $path = $file->store('payment-proofs', 'public');
        $publicUrl = $this->publicUrl($path);
        $customerInputs = $this->parseItemDetails($request->input('item_details'));

        try {
            $order = DB::transaction(function () use ($id, $publicUrl, $customerInputs) {
                $order = Order::query()
                    ->whereKey($id)
                    ->lockForUpdate()
                    ->first();

                if (! $order) {
                    return null;
                }

                if ($order->payment_proof_uploaded_at) {
                    throw ValidationException::withMessages([
                        'proof' => ['Bukti pembayaran sudah pernah dikirim untuk order ini.'],
                    ]);
                }

                $order->load('items');
                $this->validateAndReserveStock($order);
                $this->applyCustomerInputs($order, $customerInputs);

                $order->payment_proof_url = $publicUrl;
                $order->payment_proof_uploaded_at = now();
                if (! $order->order_code) {
                    $order->order_code = $this->generateOrderCode();
                }
                $order->save();

                return $order;
            });
        } catch (ValidationException $exception) {
            Storage::disk('public')->delete($path);
            $errors = $exception->errors();
            $message = collect($errors)->flatten()->first() ?? 'Validasi gagal.';
            return response()->json([
                'message' => $message,
                'errors' => $errors,
            ], 422);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }

        if ($order instanceof \Illuminate\Http\JsonResponse) {
            return $order;
        }

        if (! $order) {
            Storage::disk('public')->delete($path);
            return response()->json(['message' => 'Order tidak ditemukan.'], 404);
        }

        $order->loadMissing('items');

        $adminMessage = $this->buildAdminMessage($order, $publicUrl);
        $customerMessage = $this->buildCustomerMessage($order);

        $adminResponse = Http::withHeaders([
            'Authorization' => $token,
        ])->post('https://api.fonnte.com/send', [
            'target' => $adminWa,
            'message' => $adminMessage,
        ]);

        if (! $adminResponse->ok()) {
            return response()->json([
                'message' => 'Bukti pembayaran terkirim.',
                'warning' => 'Notifikasi ke admin gagal dikirim.',
                'proof_url' => $publicUrl,
                'order_code' => $order->order_code,
            ], 200);
        }

        $adminPayload = $adminResponse->json();
        if (isset($adminPayload['status']) && $adminPayload['status'] === false) {
            return response()->json([
                'message' => 'Bukti pembayaran terkirim.',
                'warning' => 'Notifikasi ke admin gagal dikirim.',
                'proof_url' => $publicUrl,
                'order_code' => $order->order_code,
            ], 200);
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
                . ($item->duration_snapshot ? ' (' . $item->duration_snapshot . ')' : '')
                . ' [' . $this->methodLabel($item->delivery_method) . ']'
                . ' x' . $item->qty
                . ' = Rp' . number_format($item->line_total, 0, ',', '.');
            if ($item->customer_email) {
                $lines[] = '  Email user: ' . $item->customer_email;
            }
            if ($item->customer_password) {
                $lines[] = '  Password user: ' . $item->customer_password;
            }
            if ($item->customer_note) {
                $lines[] = '  Catatan user: ' . $item->customer_note;
            }
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
                . ($item->duration_snapshot ? ' (' . $item->duration_snapshot . ')' : '')
                . ' [' . $this->methodLabel($item->delivery_method) . ']'
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
        $lines[] = 'Status: menunggu konfirmasi admin.';
        $lines[] = 'Simpan ID order ini untuk cek status: ' . ($order->order_code ?? $order->id);

        return implode("\n", $lines);
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

    private function validateAndReserveStock(Order $order): void
    {
        $items = $order->items;
        $productIds = $items->pluck('product_id')->unique()->values();
        $variantIds = $items->pluck('product_variant_id')->filter()->unique()->values();
        $products = Product::query()
            ->with('variants')
            ->whereIn('id', $productIds)
            ->where('is_active', true)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages([
                'items' => ['Ada produk yang sudah tidak aktif atau dihapus. Silakan checkout ulang.'],
            ]);
        }

        $variants = collect();
        if ($variantIds->isNotEmpty()) {
            $variants = \App\Models\ProductVariant::query()
                ->whereIn('id', $variantIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
        }

        $existingFlashQtyMap = OrderItem::query()
            ->select('product_id', DB::raw('SUM(qty) as total'))
            ->whereIn('product_id', $productIds)
            ->where('is_flash_sale', true)
            ->where('order_id', '!=', $order->id)
            ->whereHas('order', function ($query) use ($order) {
                $query->where('customer_whatsapp', $order->customer_whatsapp)
                    ->whereNotNull('payment_proof_uploaded_at')
                    ->whereNotIn('status', ['INVALID_PAYMENT', 'REFUND']);
            })
            ->groupBy('product_id')
            ->pluck('total', 'product_id');

        foreach ($items as $item) {
            $product = $products->get($item->product_id);
            $qty = (int) $item->qty;
            $variant = null;
            if ($item->product_variant_id) {
                $variant = $variants->get($item->product_variant_id);
                if (! $variant || ! $variant->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["Varian {$product->name} sudah tidak tersedia. Silakan checkout ulang."],
                    ]);
                }
            }

            $baseStock = $variant ? $variant->stock : $product->stock;
            if ($baseStock !== null && $qty > (int) $baseStock) {
                throw ValidationException::withMessages([
                    'items' => ["Stok {$product->name} tidak mencukupi. Silakan checkout ulang."],
                ]);
            }

            if (! $item->is_flash_sale) {
                continue;
            }

            $flashActive = $this->isFlashSaleWindow($product);
            if (! $flashActive) {
                throw ValidationException::withMessages([
                    'items' => ["Flash sale {$product->name} sudah berakhir. Silakan checkout ulang."],
                ]);
            }

            $flashRemaining = $this->flashSaleRemaining($product);
            if ($flashRemaining !== null && $qty > $flashRemaining) {
                throw ValidationException::withMessages([
                    'items' => ["Stok flash sale {$product->name} tinggal {$flashRemaining}. Silakan checkout ulang."],
                ]);
            }

            if ($product->max_qty_per_customer) {
                $existingQty = (int) ($existingFlashQtyMap[$product->id] ?? 0);
                $maxQty = (int) $product->max_qty_per_customer;
                if ($existingQty + $qty > $maxQty) {
                    throw ValidationException::withMessages([
                        'items' => ["Maksimal pembelian {$product->name} adalah {$maxQty} per pelanggan."],
                    ]);
                }
            }
        }

        foreach ($items as $item) {
            $product = $products->get($item->product_id);
            if (! $product) {
                continue;
            }

            $qty = (int) $item->qty;
            if ($item->product_variant_id) {
                $variant = $variants->get($item->product_variant_id);
                if ($variant && $variant->stock !== null) {
                    $variant->decrement('stock', $qty);
                }
            } elseif ($product->stock !== null) {
                $product->decrement('stock', $qty);
            }

            if ($item->is_flash_sale && $product->flash_sale_stock !== null) {
                $product->increment('flash_sale_sold', $qty);
            }
        }
    }

    private function isFlashSaleWindow(Product $product): bool
    {
        if (! $product->flash_sale_active) {
            return false;
        }

        if (! $product->flash_sale_discount_type || ! $product->flash_sale_discount_value) {
            return false;
        }

        $now = now();
        if ($product->flash_sale_start_at && $now->lt($product->flash_sale_start_at)) {
            return false;
        }
        if ($product->flash_sale_end_at && $now->gt($product->flash_sale_end_at)) {
            return false;
        }

        return true;
    }

    private function flashSaleRemaining(Product $product): ?int
    {
        if ($product->flash_sale_stock === null) {
            return null;
        }

        $sold = $product->flash_sale_sold ?? 0;
        $remaining = (int) $product->flash_sale_stock - (int) $sold;
        return max($remaining, 0);
    }

    private function publicUrl(string $path): string
    {
        $base = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
        if ($base) {
            return $base . '/storage/' . ltrim($path, '/');
        }

        return Storage::disk('public')->url($path);
    }

    private function parseItemDetails($raw): array
    {
        if (! $raw) {
            return [];
        }

        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (! is_array($decoded)) {
            return [];
        }

        $map = [];
        foreach ($decoded as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $orderItemId = $entry['order_item_id'] ?? $entry['id'] ?? null;
            if (! $orderItemId) {
                continue;
            }
            $map[(int) $orderItemId] = [
                'email' => isset($entry['email']) ? trim((string) $entry['email']) : null,
                'password' => isset($entry['password']) ? trim((string) $entry['password']) : null,
                'note' => isset($entry['note']) ? trim((string) $entry['note']) : null,
            ];
        }

        return $map;
    }

    private function applyCustomerInputs(Order $order, array $inputs): void
    {
        foreach ($order->items as $item) {
            $method = $item->delivery_method ?? 'admin_account';
            $detail = $inputs[$item->id] ?? [];
            $email = $detail['email'] ?? null;
            $password = $detail['password'] ?? null;
            $note = $detail['note'] ?? null;

            if ($method === 'invite' && ! $email) {
                throw ValidationException::withMessages([
                    'items' => ['Email wajib diisi untuk metode invite.'],
                ]);
            }

            if ($method === 'own_account') {
                if (! $email || ! $password) {
                    throw ValidationException::withMessages([
                        'items' => ['Email dan password wajib diisi untuk metode akun kamu.'],
                    ]);
                }
            }

            $item->customer_email = $email ?: null;
            $item->customer_password = $password ?: null;
            $item->customer_note = $note ?: null;
            $item->save();
        }
    }

}
