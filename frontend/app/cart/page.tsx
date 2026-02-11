'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { formatRupiah } from '@/lib/formatRupiah';

export default function CartPage() {
  const {
    items,
    updateQty,
    removeItem,
    total,
  } = useCart();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Keranjang</h1>
          <p className="text-sm text-slate-600">
            Atur jumlah produk sebelum checkout.
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-brand">
          Kembali ke katalog
        </Link>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="rounded-2xl border border-white/60 bg-white/70 p-6 text-sm text-slate-600 shadow-soft">
              Keranjang masih kosong. Yuk pilih produk di katalog.
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-ink">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.discountLabel ? (
                      <>
                        <span className="line-through">
                          {formatRupiah(item.originalPrice)}
                        </span>
                        <span className="ml-2 text-emerald-700">
                          {formatRupiah(item.price)} ({item.discountLabel})
                        </span>
                      </>
                    ) : (
                      <span>{formatRupiah(item.price)} / item</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateQty(item.product_id, item.qty - 1)}
                  className="h-8 w-8 rounded-full border border-slate-200 text-sm"
                >
                  -
                </button>
                <span className="min-w-[32px] text-center text-sm font-semibold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(item.product_id, item.qty + 1)}
                  className="h-8 w-8 rounded-full border border-slate-200 text-sm"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.product_id)}
                  className="ml-3 text-xs font-semibold text-red-500"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Total</span>
              <span className="text-lg font-semibold text-ink">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
          <Link
            href="/checkout"
            className={`block rounded-full px-4 py-3 text-center text-sm font-semibold text-white ${
              items.length === 0 ? 'cursor-not-allowed bg-slate-300' : 'bg-brand'
            }`}
          >
            Checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
