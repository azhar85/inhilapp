'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { formatRupiah } from '@/lib/formatRupiah';
import type { Product, SiteSettings } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function HomePage() {
  const { addItem, count, totalAfterVoucher } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [now, setNow] = useState(() => new Date());

  const categories = useMemo(() => {
    const items = products
      .map((product) => product.category)
      .filter((category): category is string => Boolean(category));
    return ['Semua', ...Array.from(new Set(items))];
  }, [products]);

  const queryString = useMemo(() => {
    if (!search.trim()) return '';
    return `?q=${encodeURIComponent(search.trim())}`;
  }, [search]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Semua') return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach((product) => {
      const category = product.category ?? 'Lainnya';
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)?.push(product);
    });
    return Array.from(map, ([category, items]) => ({ category, items }));
  }, [filteredProducts]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/products${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Gagal memuat produk');
        }

        const data = (await response.json()) as Product[];
        setProducts(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError('Produk gagal dimuat. Coba refresh halaman.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [queryString]);

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const storeName = settings?.store_name?.trim() ? settings.store_name : 'InhilApp';
  const storeTagline = settings?.store_tagline ?? 'Premium App';
  const logoUrl = settings?.logo_url || '/logo.png';

  const showCartBar = count > 0;

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const upcomingFlashes = useMemo(() => {
    return products
      .map((product) => ({
        product,
        start: parseDate(product.flash_sale_start_at),
      }))
      .filter(
        (item) =>
          item.product.flash_sale_active &&
          item.start &&
          item.start.getTime() > now.getTime()
      )
      .sort((a, b) => a.start!.getTime() - b.start!.getTime());
  }, [products, now]);

  const activeFlashes = useMemo(() => {
    return products
      .map((product) => ({
        product,
        start: parseDate(product.flash_sale_start_at),
        end: parseDate(product.flash_sale_end_at),
      }))
      .filter((item) => {
        if (!item.product.flash_sale_active || !item.end) return false;
        if (item.start && now.getTime() < item.start.getTime()) return false;
        return now.getTime() <= item.end.getTime();
      })
      .sort((a, b) => a.end!.getTime() - b.end!.getTime());
  }, [products, now]);

  const formatCountdown = (target?: Date | null) => {
    if (!target) return '';
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return '00:00:00';
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    if (days > 0) {
      return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const getFlashPrice = (product: Product) => {
    const original = product.price;
    const type = product.flash_sale_discount_type ?? null;
    const value = product.flash_sale_discount_value ?? 0;
    if (!type || value <= 0) return original;
    let discount = 0;
    if (type === 'PERCENT') {
      discount = Math.round(original * (value / 100));
    } else if (type === 'FIXED') {
      discount = value;
    }
    if (discount < 0) discount = 0;
    if (discount > original) discount = original;
    return original - discount;
  };

  const getFlashState = (product: Product) => {
    if (!product.flash_sale_active) return 'inactive';
    const start = parseDate(product.flash_sale_start_at);
    const end = parseDate(product.flash_sale_end_at);
    if (start && now < start) return 'waiting';
    if (end && now > end) return 'ended';
    return 'active';
  };

  return (
    <main
      className={`relative mx-auto max-w-6xl px-6 py-10 ${
        showCartBar ? 'pb-28' : ''
      }`}
    >
      <nav className="sticky top-4 z-30">
        <div className="rounded-3xl border border-white/70 bg-white/90 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {storeName}
                </span>
                <span className="text-sm font-semibold text-ink">
                  {storeTagline}
                </span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/track"
                className="rounded-full border border-ink/20 bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink/40"
              >
                Cek ID
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {(upcomingFlashes.length > 0 || activeFlashes.length > 0) && (
        <section className="mt-6 space-y-4">
          {upcomingFlashes.map((item) => (
            <div
              key={`upcoming-${item.product.id}`}
              className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(125deg,rgba(236,253,245,0.95),rgba(239,246,255,0.95)_45%,rgba(255,255,255,0.98))] p-4 shadow-soft backdrop-blur sm:p-5"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -left-12 -bottom-14 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
              <div className="relative grid grid-cols-[minmax(0,1fr)_126px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-emerald-700 sm:text-xs">
                    Akan Dimulai
                  </div>
                  <div className="text-base font-semibold text-ink sm:text-lg">
                    Flash sale siap dibuka
                  </div>
                  <div className="text-sm text-slate-600">
                    Harga turun otomatis saat hitung mundur selesai.
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 sm:text-sm">
                    Mulai dalam {formatCountdown(item.start)}
                  </div>
                  
                </div>
                <div className="w-[126px] justify-self-end sm:w-[170px]">
                  <ProductCard
                    product={item.product}
                    onAdd={(product) => addItem(product, 1, 'flash')}
                    priceOverride={getFlashPrice(item.product)}
                    originalPriceOverride={item.product.price}
                    stockOverride={
                      item.product.flash_sale_remaining ??
                      item.product.flash_sale_stock ??
                      null
                    }
                    disableAdd
                    hideAdd
                    compact
                  />
                </div>
              </div>
            </div>
          ))}

          {activeFlashes.map((item) => (
            <div
              key={`active-${item.product.id}`}
              className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(125deg,rgba(255,247,237,0.97),rgba(255,251,235,0.97)_45%,rgba(255,255,255,0.98))] p-4 shadow-soft backdrop-blur sm:p-5"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-200/45 blur-3xl" />
              <div className="pointer-events-none absolute -left-12 -bottom-14 h-36 w-36 rounded-full bg-orange-200/40 blur-3xl" />
              <div className="relative grid grid-cols-[minmax(0,1fr)_126px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-white/90 px-3 py-1 text-[11px] font-semibold text-amber-700 sm:text-xs">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    Live Sekarang
                  </div>
                  <div className="text-base font-semibold text-ink sm:text-lg">
                    Flash sale sedang berlangsung
                  </div>
                  <div className="text-sm text-slate-600">
                    Ambil harga termurah sebelum sesi ini berakhir.
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-700 sm:text-sm">
                    Sisa waktu {formatCountdown(item.end)}
                  </div>
                  
                </div>
                <div className="w-[126px] justify-self-end sm:w-[170px]">
                  <ProductCard
                    product={item.product}
                    onAdd={(product) => addItem(product, 1, 'flash')}
                    priceOverride={getFlashPrice(item.product)}
                    originalPriceOverride={item.product.price}
                    stockOverride={
                      item.product.flash_sale_remaining ??
                      item.product.flash_sale_stock ??
                      null
                    }
                    compact
                  />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="mt-8 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Cari Produk
          </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari produk, contoh: Netflix"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:outline-none"
          />
        </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeCategory === category
                  ? 'border-ink bg-ink text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Katalog Aplikasi</h2>
          </div>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-slate-600">Memuat katalog...</p>
        )}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {!loading && !error && filteredProducts.length === 0 && (
          <p className="mt-6 text-sm text-slate-600">Produk tidak ditemukan.</p>
        )}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="mt-6 flex flex-col gap-8">
            {groupedProducts.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {group.category}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] sm:gap-5 lg:gap-6">
                  {group.items.map((product) => (
                    (() => {
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAdd={addItem}
                        />
                      );
                    })()
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 pb-12">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {storeName}
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {storeTagline}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Katalog premium digital dengan proses cepat dan aman melalui
                WhatsApp. Simpan ID order untuk pelacakan.
              </p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Bantuan
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-ink/70">
                <Link href="/track" className="transition hover:text-ink">
                  Cek ID Pesanan
                </Link>
                <Link href="/cart" className="transition hover:text-ink">
                  Keranjang
                </Link>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Kontak
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-ink/70">
                <a
                  href="https://instagram.com/inhilapp"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-ink"
                >
                  Instagram @inhilapp
                </a>
                <a
                  href="https://wa.me/6285187715318"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-ink"
                >
                  WhatsApp 085187715318
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 text-xs text-slate-400">
            <div>
              (c) {new Date().getFullYear()} {storeName}. All rights reserved.
            </div>
            <div>InhilApp Digital Store</div>
          </div>
        </div>
      </footer>

      {showCartBar && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur">
            <div>
              
              <div className="mt-1 text-sm font-semibold text-ink">
                {count} item - {formatRupiah(totalAfterVoucher)}
              </div>
            </div>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Cek Keranjang
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
