'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatRupiah } from '@/lib/formatRupiah';
import type { Order, SiteSettings } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function PayPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showQris, setShowQris] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const subtotal = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + item.line_total, 0);
  }, [order?.items]);

  const voucherDiscount = order?.voucher_discount ?? 0;

  useEffect(() => {
    if (!orderId) return;

    const controller = new AbortController();

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setError('Order tidak ditemukan.');
          setOrder(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Gagal memuat order');
        }

        const data = (await response.json()) as Order;
        setOrder(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError('Gagal memuat order.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadOrder();

    return () => controller.abort();
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        const response = await fetch(`${API_BASE}/api/settings`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as SiteSettings;
        setSettings(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    loadSettings();
    return () => controller.abort();
  }, []);

  const qrisUrl = settings?.qris_url || '/qris.png';
  const storeName = settings?.store_name || 'InhilApp';

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!proofFile || !orderId) {
      setUploadError('Pilih file bukti pembayaran terlebih dahulu.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('proof', proofFile);

      const response = await fetch(
        `${API_BASE}/api/orders/${orderId}/payment-proof`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setUploadError(data.message ?? 'Gagal mengirim bukti pembayaran.');
        return;
      }

      if (data?.order_code) {
        setOrder((prev) => (prev ? { ...prev, order_code: data.order_code } : prev));
      }
      setProofFile(null);
      const code = data?.order_code ?? order?.order_code ?? orderId ?? order?.id;
      if (code) {
        router.push(`/track?code=${encodeURIComponent(String(code))}&success=1`);
      }
    } catch {
      setUploadError('Gagal mengirim bukti pembayaran.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Pembayaran</h1>
          <p className="text-sm text-slate-600">
            Bayar via QRIS, lalu upload bukti pembayaran.
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-brand">
          Kembali ke katalog
        </Link>
      </header>

      {loading && <p className="mt-6 text-sm text-slate-600">Memuat order...</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {order && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-5">
              <div className="text-sm font-semibold text-ink">Ringkasan Pesanan</div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Nama
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {order.customer_name}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    WhatsApp
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {order.customer_whatsapp}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
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
              <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>
                      Voucher {order.voucher_code ? `(${order.voucher_code})` : ''}
                    </span>
                    <span>-{formatRupiah(voucherDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-semibold text-ink">
                  <span>Total</span>
                  <span>{formatRupiah(order.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
              <button
                type="button"
                onClick={() => setShowQris((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink"
                aria-expanded={showQris}
              >
                <span>QRIS Pembayaran</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {showQris ? 'Tutup' : 'Lihat QRIS'}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                  showQris ? 'mt-4 max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-sm text-slate-600">
                  Silakan bayar via QRIS. Setelah bayar, upload bukti pembayaran
                  agar pesanan diproses.
                </p>
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <img
                    src={qrisUrl}
                    alt={`QRIS ${storeName}`}
                    className="mx-auto w-full max-w-sm"
                  />
                </div>
              </div>
            </div>

            <form onSubmit={handleUpload} className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <label
                  htmlFor="payment-proof"
                  className="text-sm font-semibold text-ink"
                >
                  Upload bukti pembayaran (JPG/PNG)
                </label>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    id="payment-proof"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setProofFile(file);
                      setUploadError(null);
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="payment-proof"
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-brand hover:text-ink"
                  >
                    <span className="font-semibold text-ink">
                      Pilih gambar bukti pembayaran
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      Browse
                    </span>
                  </label>
                  <div className="text-xs text-slate-500">
                    {proofFile ? proofFile.name : 'Belum ada file dipilih.'}
                  </div>
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}

              <button
                type="submit"
                disabled={uploading || !proofFile}
                className="w-full rounded-full bg-ink px-4 py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <span className="flex items-center justify-center gap-2">
                  {uploading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  <span>
                    {uploading ? 'process...' : 'Checkout'}
                  </span>
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
