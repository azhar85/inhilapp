'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import type { Product, SiteSettings } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function HomePage() {
  const { addItem, count } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

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

  const storeName = settings?.store_name?.trim() ? settings.store_name : 'InhilApp';
  const storeTagline = settings?.store_tagline ?? 'Premium App';
  const logoUrl = settings?.logo_url || '/logo.png';

  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
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
              <Link
                href="/cart"
                className="relative grid h-11 w-11 place-items-center rounded-full bg-ink text-white transition hover:bg-slate-900"
                aria-label={`Keranjang (${count})`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="20" r="1.6" />
                  <circle cx="17" cy="20" r="1.6" />
                  <path d="M3 4h2l2.6 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H7.2" />
                </svg>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

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
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={addItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 pb-10">
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-soft">
          <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {storeName}
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Katalog premium digital dengan proses cepat dan aman melalui
                WhatsApp. Simpan ID order untuk pelacakan.
              </p>
              <div className="mt-4 text-xs text-slate-400">
                (c) {new Date().getFullYear()} {storeName}. All rights reserved.
              </div>
            </div>
            <div className="sm:justify-self-end">
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
        </div>
      </footer>
    </main>
  );
}
