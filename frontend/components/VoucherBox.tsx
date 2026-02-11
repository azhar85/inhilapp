'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/hooks/useCart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function VoucherBox({ subtotal }: { subtotal: number }) {
  const {
    voucherCode,
    voucherDiscount,
    voucherLabel,
    applyVoucher,
    clearVoucher,
  } = useCart();
  const [code, setCode] = useState(voucherCode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCode(voucherCode);
  }, [voucherCode]);

  async function handleApply() {
    if (!code.trim()) {
      setMessage('Masukkan kode voucher.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.message ?? 'Voucher tidak valid.');
        return;
      }

      applyVoucher(data.code, data.discount_amount, data.label ?? null);
      setMessage('Voucher berhasil diterapkan.');
    } catch {
      setMessage('Gagal memeriksa voucher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft">
      <div className="text-sm font-semibold text-ink">Voucher Diskon</div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Contoh: WELCOME10"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Memeriksa...' : 'Pakai'}
        </button>
      </div>

      {voucherCode && voucherDiscount > 0 && (
        <div className="mt-3 text-xs text-emerald-700">
          Voucher aktif: {voucherCode} {voucherLabel ? `(${voucherLabel})` : ''}
          <button
            type="button"
            onClick={() => {
              clearVoucher();
              setCode('');
            }}
            className="ml-2 text-xs font-semibold text-slate-500"
          >
            Hapus
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
