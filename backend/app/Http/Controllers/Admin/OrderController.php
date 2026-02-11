<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

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
            'status' => ['sometimes', 'in:PENDING_PAYMENT,PAID,DELIVERED,CANCELLED,INVALID_PAYMENT,REFUND'],
            'notes' => ['nullable', 'string'],
            'fulfillment_account' => ['nullable', 'string'],
            'fulfillment_email' => ['nullable', 'string'],
            'fulfillment_password' => ['nullable', 'string'],
            'fulfillment_link' => ['nullable', 'string'],
            'fulfillment_notes' => ['nullable', 'string'],
        ]);

        $order->fill($data);
        $order->save();

        return response()->json($order);
    }
}
