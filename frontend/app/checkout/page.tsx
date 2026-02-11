'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CartSummary from '@/components/CartSummary';
import VoucherBox from '@/components/VoucherBox';
import { useCart } from '@/hooks/useCart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    total,
    subtotal,
    discountTotal,
    voucherCode,
    voucherDiscount,
    totalAfterVoucher,
    clear,
  } = useCart();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !whatsapp.trim()) {
      setError('Nama dan nomor WhatsApp wajib diisi.');
      return;
    }

    if (items.length === 0) {
      setError('Keranjang kosong.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_whatsapp: whatsapp.trim(),
          voucher_code: voucherCode || null,
          items: items.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? 'Checkout gagal. Silakan coba lagi.');
        return;
      }

      clear();
      router.push(`/pay/${data.order_id}`);
    } catch {
      setError('Checkout gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Checkout</h1>
          <p className="text-sm text-slate-600">
            Isi data untuk melanjutkan pembayaran.
          </p>
        </div>
        <Link href="/cart" className="text-sm font-semibold text-brand">
          Kembali ke keranjang
        </Link>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <CartSummary
          items={items}
          subtotal={subtotal}
          discountTotal={discountTotal}
          voucherCode={voucherCode}
          voucherDiscount={voucherDiscount}
          total={totalAfterVoucher}
        />

        <VoucherBox subtotal={total} />

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink">Nama</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="628xxxx"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Memproses...' : 'Submit Checkout'}
          </button>
        </form>
      </div>
    </main>
  );
}
