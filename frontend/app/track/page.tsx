'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatRupiah } from '@/lib/formatRupiah';
import type { Order } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function TrackPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCode = useMemo(() => code.trim(), [code]);
  const itemCount = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + item.qty, 0);
  }, [order?.items]);
  const orderDate = useMemo(() => {
    if (!order?.created_at) return null;
    const date = new Date(order.created_at);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }, [order?.created_at]);

  const hasProof = Boolean(order?.payment_proof_uploaded_at);
  const hasFulfillment =
    Boolean(order?.fulfillment_account) ||
    Boolean(order?.fulfillment_email) ||
    Boolean(order?.fulfillment_password) ||
    Boolean(order?.fulfillment_link) ||
    Boolean(order?.fulfillment_notes);

  const statusConfig = useMemo(() => {
    switch (order?.status) {
      case 'PENDING_PAYMENT':
        if (hasProof) {
          return { label: 'Sedang dikonfirmasi', tone: 'bg-amber-100 text-amber-700 border-amber-200' };
        }
        return { label: 'Menunggu pembayaran', tone: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'PAID':
        if (!hasFulfillment) {
          return { label: 'Sedang diproses', tone: 'bg-sky-100 text-sky-700 border-sky-200' };
        }
        return { label: 'Pembayaran diterima', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'DELIVERED':
        return { label: 'Pesanan selesai', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'INVALID_PAYMENT':
        return { label: 'Pembayaran tidak sah', tone: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'REFUND':
        return { label: 'Refund', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'CANCELLED':
        return { label: 'Dibatalkan', tone: 'bg-rose-100 text-rose-700 border-rose-200' };
      default:
        return { label: order?.status ?? '-', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }, [order?.status, hasProof, hasFulfillment]);

  useEffect(() => {
    if (!initialCode) return;
    fetchOrder(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchOrder(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Masukkan ID order terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(trimmed)}`);
      if (response.status === 404) {
        setError('Order tidak ditemukan.');
        return;
      }
      if (!response.ok) {
        throw new Error('Gagal memuat order');
      }
      const data = (await response.json()) as Order;
      setOrder(data);
    } catch {
      setError('Gagal memuat order. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Cek ID</h1>
          <p className="text-sm text-slate-600">
            Masukkan ID order untuk melihat status dan detail pesanan.
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-brand">
          Kembali ke katalog
        </Link>
      </header>

      <div className="mt-8 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetchOrder(normalizedCode);
          }}
          className="flex flex-col gap-3 md:flex-row md:items-center"
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Contoh: APP-97AH1"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {order && (
        <section className="mt-8 space-y-6">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  ID Order
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink">
                  {order.order_code ?? 'Belum tersedia'}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.tone}`}
                  >
                    {statusConfig.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    Status pesanan terkini
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Atas nama
                </div>
                <div className="mt-2 text-sm font-semibold text-ink">
                  {order.customer_name}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  WhatsApp
                </div>
                <div className="mt-2 text-sm font-semibold text-ink">
                  {order.customer_whatsapp}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Pesanan
                </div>
                <div className="mt-2 text-sm font-semibold text-ink">
                  {orderDate ?? '-'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Jumlah Item
                </div>
                <div className="mt-2 text-sm font-semibold text-ink">
                  {itemCount} item
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
            <div className="text-sm font-semibold text-ink">Detail Pesanan</div>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium text-ink">
                      {item.product_name_snapshot}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.qty} x {formatRupiah(item.unit_price)}
                    </div>
                  </div>
                  <div className="font-semibold text-ink">
                    {formatRupiah(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
            {(order.voucher_discount ?? 0) > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm text-emerald-700">
                <span>
                  Voucher {order.voucher_code ? `(${order.voucher_code})` : ''}
                </span>
                <span>-{formatRupiah(order.voucher_discount ?? 0)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatRupiah(order.total_amount)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
            <div className="text-sm font-semibold text-ink">Akun / Link Premium</div>
            {(() => {
              const hasFulfillment =
                Boolean(order.fulfillment_account) ||
                Boolean(order.fulfillment_email) ||
                Boolean(order.fulfillment_password) ||
                Boolean(order.fulfillment_link) ||
                Boolean(order.fulfillment_notes);
              const canShow =
                hasFulfillment || order.status === 'DELIVERED' || order.status === 'PAID';

              if (!canShow) {
                return (
                  <p className="mt-4 text-sm text-slate-600">
                    Detail premium akan muncul setelah pesanan diproses.
                  </p>
                );
              }

              return (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {order.fulfillment_account && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Akun / Credential
                      </div>
                      <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {order.fulfillment_account}
                      </div>
                    </div>
                  )}
                  {order.fulfillment_email && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Email
                      </div>
                      <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {order.fulfillment_email}
                      </div>
                    </div>
                  )}
                  {order.fulfillment_password && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Password
                      </div>
                      <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {order.fulfillment_password}
                      </div>
                    </div>
                  )}
                  {order.fulfillment_link && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Link / Invite
                      </div>
                      <div className="mt-2 break-all rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {order.fulfillment_link}
                      </div>
                    </div>
                  )}
                  {order.fulfillment_notes && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Catatan
                      </div>
                      <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {order.fulfillment_notes}
                      </div>
                    </div>
                  )}
                  {!hasFulfillment && (
                    <p className="text-sm text-slate-600">
                      Detail premium belum diinput oleh admin.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}
    </main>
  );
}
