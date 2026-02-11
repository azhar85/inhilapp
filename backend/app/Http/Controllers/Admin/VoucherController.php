<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function index()
    {
        return response()->json(
            Voucher::query()->orderByDesc('created_at')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, null);

        $data['code'] = strtoupper(trim($data['code']));
        $data['is_active'] = $data['is_active'] ?? true;

        $voucher = Voucher::create($data);

        return response()->json($voucher, 201);
    }

    public function update(Request $request, Voucher $voucher)
    {
        $data = $this->validatePayload($request, $voucher->id);

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        $voucher->fill($data);
        $voucher->save();

        return response()->json($voucher);
    }

    public function destroy(Voucher $voucher)
    {
        $voucher->delete();

        return response()->json(['message' => 'Voucher dihapus.']);
    }

    private function validatePayload(Request $request, ?int $ignoreId): array
    {
        $uniqueRule = 'unique:vouchers,code';
        if ($ignoreId) {
            $uniqueRule .= ',' . $ignoreId;
        }

        return $request->validate([
            'code' => ['required', 'string', 'max:50', $uniqueRule],
            'type' => ['required', 'in:PERCENT,FIXED'],
            'value' => ['required', 'integer', 'min:0'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_order' => ['nullable', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
