<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index()
    {
        return response()->json(
            Stock::with('product')->orderByDesc('created_at')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);

        $data['is_active'] = $data['is_active'] ?? true;

        $stock = Stock::create($data);

        return response()->json($stock->load('product'), 201);
    }

    public function update(Request $request, Stock $stock)
    {
        $data = $this->validatePayload($request);

        $stock->fill($data);
        $stock->save();

        return response()->json($stock->load('product'));
    }

    public function destroy(Stock $stock)
    {
        $stock->delete();

        return response()->json(['message' => 'Stock dihapus.']);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'name' => ['required', 'string', 'max:255'],
            'account' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'link' => ['nullable', 'string', 'max:2048'],
            'description' => ['nullable', 'string'],
            'active_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:active_date'],
            'duration' => ['required', 'string', 'max:255'],
            'warranty' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
