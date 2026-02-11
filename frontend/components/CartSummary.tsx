'use client';

import type { CartItem } from '@/hooks/useCart';
import { formatRupiah } from '@/lib/formatRupiah';

type CartSummaryProps = {
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  voucherCode?: string;
  voucherDiscount?: number;
  total: number;
};

export default function CartSummary({
  items,
  subtotal,
  discountTotal,
  voucherCode,
  voucherDiscount = 0,
  total,
}: CartSummaryProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Ringkasan</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Keranjang masih kosong.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-medium text-ink">{item.name}</div>
                <div className="text-xs text-slate-500">
                  {item.qty} x {formatRupiah(item.price)}
                </div>
              </div>
              <div className="text-sm font-semibold text-ink">
                {formatRupiah(item.price * item.qty)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Diskon</span>
            <span>-{formatRupiah(discountTotal)}</span>
          </div>
        )}
        {voucherDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Voucher {voucherCode ? `(${voucherCode})` : ''}</span>
            <span>-{formatRupiah(voucherDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-base font-semibold text-ink">
          <span>Total</span>
          <span>{formatRupiah(total)}</span>
        </div>
      </div>
    </div>
  );
}
