'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { formatRupiah } from '@/lib/formatRupiah';
import { getPricing } from '@/lib/pricing';

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const fallbackLabel = product.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const images = useMemo(() => {
    if (product.product_images && product.product_images.length > 0) {
      return product.product_images;
    }
    if (product.image_url) return [product.image_url];
    return [];
  }, [product.image_url, product.product_images]);

  const activeImage = images[activeIndex] ?? null;
  const coverImage = product.image_url ?? images[0] ?? null;
  const pricing = getPricing(product);

  return (
    <>
      <div className="group relative aspect-square w-full max-w-[220px] justify-self-start overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-soft transition hover:-translate-y-1 hover:shadow-2xl">
        {coverImage ? (
          <img
            src={coverImage}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-100 text-center text-sm font-semibold text-ink/70">
            {fallbackLabel}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 z-10"
          aria-label={`Lihat detail ${product.name}`}
        />

        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
          <h3 className="line-clamp-2 pr-12 text-[11px] font-semibold leading-tight text-white sm:text-sm">
            {product.name}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold text-white/90 sm:text-xs">
              {pricing.discountAmount > 0 ? (
                <div className="flex flex-col">
                  <span className="line-through text-white/60">
                    {formatRupiah(pricing.originalPrice)}
                  </span>
                  <span>{formatRupiah(pricing.finalPrice)}</span>
                </div>
              ) : (
                <span>{formatRupiah(product.price)}</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(product);
          }}
          className="absolute bottom-2 right-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-semibold text-ink shadow-sm transition hover:bg-slate-100 sm:bottom-3 sm:right-3 sm:h-8 sm:w-8"
          aria-label={`Tambah ${product.name} ke keranjang`}
        >
          +
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setActiveIndex(0);
            }}
            className="absolute inset-0 z-0 h-full w-full cursor-default"
            aria-label="Tutup modal"
          />

          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="grid max-h-[90vh] grid-rows-[auto,1fr] lg:max-h-[85vh] lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-1">
              <div className="relative bg-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setActiveIndex(0);
                  }}
                  className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-xs font-semibold text-ink shadow"
                  aria-label="Tutup"
                >
                  X
                </button>

                <div className="relative h-56 w-full sm:h-72 lg:h-full lg:min-h-[420px]">
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={`${product.name} ${activeIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      Tidak ada gambar
                    </div>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex((prev) =>
                            prev === 0 ? images.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow"
                        aria-label="Gambar sebelumnya"
                      >
                        {'<'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex((prev) =>
                            prev === images.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow"
                        aria-label="Gambar berikutnya"
                      >
                        {'>'}
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-200 bg-white/95 p-3">
                    {images.map((image, index) => (
                      <button
                        key={`thumb-${product.id}-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`h-12 w-12 overflow-hidden rounded-2xl border ${
                          index === activeIndex ? 'border-ink' : 'border-transparent'
                        }`}
                        aria-label={`Lihat gambar ${index + 1}`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col gap-5 overflow-y-auto px-6 pb-6 pt-6 lg:px-7">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Detail Produk
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">
                    {product.name}
                  </h3>
                  <div className="mt-1 text-sm text-slate-600">
                    {product.category ?? 'Digital'}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Harga
                    </div>
                    <div className="mt-2 font-semibold text-ink">
                      {pricing.discountAmount > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 line-through">
                            {formatRupiah(pricing.originalPrice)}
                          </span>
                          <span>{formatRupiah(pricing.finalPrice)}</span>
                        </div>
                      ) : (
                        formatRupiah(product.price)
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Durasi
                    </div>
                    <div className="mt-2 font-semibold text-ink">
                      {product.duration ?? 'Tidak tersedia'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Garansi
                    </div>
                    <div className="mt-2 font-semibold text-ink">
                      {product.warranty ?? 'Tidak ada informasi garansi.'}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  {product.description ?? 'Produk digital siap kirim via WhatsApp.'}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(product);
                      setOpen(false);
                    }}
                    className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
                  >
                    Tambah ke Keranjang
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
