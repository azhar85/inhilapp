'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Product, ProductVariant } from '@/lib/types';
import { formatRupiah } from '@/lib/formatRupiah';

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product, variant?: ProductVariant | null) => void;
  priceOverride?: number;
  originalPriceOverride?: number;
  stockOverride?: number | null;
  disableAdd?: boolean;
  hideAdd?: boolean;
  frameMode?: 'default' | 'embedded';
  compact?: boolean;
  variantOverride?: ProductVariant | null;
};

const METHOD_LABELS: Record<string, string> = {
  invite: 'Invite',
  admin_account: 'Akun Admin',
  own_account: 'Akun Kamu',
  link: 'Link',
  phone: 'Nomor HP',
};

function applyDiscount(
  basePrice: number,
  type?: 'PERCENT' | 'FIXED' | null,
  value?: number | null
): { finalPrice: number; discountAmount: number } {
  if (!type || !value || value <= 0) {
    return { finalPrice: basePrice, discountAmount: 0 };
  }
  let discount = 0;
  if (type === 'PERCENT') {
    discount = Math.round(basePrice * (value / 100));
  } else if (type === 'FIXED') {
    discount = value;
  }
  if (discount < 0) discount = 0;
  if (discount > basePrice) discount = basePrice;
  return { finalPrice: basePrice - discount, discountAmount: discount };
}

function normalizeVariants(variants?: ProductVariant[] | null) {
  if (!variants || variants.length === 0) return [];
  return variants.filter((variant) => variant.is_active !== false);
}

export default function ProductCard({
  product,
  onAdd,
  priceOverride,
  originalPriceOverride,
  stockOverride,
  disableAdd = false,
  hideAdd = false,
  frameMode = 'default',
  compact = false,
  variantOverride = null,
}: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const variants = useMemo(() => normalizeVariants(product.variants), [product.variants]);
  const hasVariantSelector = variants.length > 0 && !variantOverride;
  const durationOptions = useMemo(() => {
    if (!hasVariantSelector) return [];
    const options: Array<{ id: number | null; label: string; variant: ProductVariant | null }> = [
      {
        id: null,
        label: product.duration ? product.duration : 'Durasi utama',
        variant: null,
      },
      ...variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        variant,
      })),
    ];
    return options;
  }, [hasVariantSelector, product.duration, variants]);

  const getOptionStock = (option: { variant: ProductVariant | null }) => {
    if (option.variant) {
      return typeof option.variant.stock === 'number' ? option.variant.stock : null;
    }
    return typeof product.stock === 'number' ? product.stock : null;
  };

  const isOptionAvailable = (option: { variant: ProductVariant | null }) => {
    const stock = getOptionStock(option);
    return stock === null || stock > 0;
  };

  const defaultVariantId = useMemo(() => {
    if (variantOverride) return variantOverride.id ?? null;
    if (!hasVariantSelector) return null;
    const firstAvailable = durationOptions.find((option) => isOptionAvailable(option));
    return firstAvailable ? firstAvailable.id : durationOptions[0]?.id ?? null;
  }, [variantOverride, hasVariantSelector, durationOptions]);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(defaultVariantId);

  useEffect(() => {
    setSelectedVariantId(defaultVariantId);
  }, [defaultVariantId]);

  const selectedVariant =
    variantOverride ??
    (selectedVariantId === null
      ? null
      : variants.find((variant) => variant.id === selectedVariantId) ?? null);

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

  const basePrice = selectedVariant?.price ?? product.price;
  const pricing = useMemo(() => {
    if (priceOverride !== undefined || originalPriceOverride !== undefined) {
      const originalPrice = originalPriceOverride ?? basePrice;
      const finalPrice = priceOverride ?? originalPrice;
      const discountAmount = Math.max(originalPrice - finalPrice, 0);
      return {
        originalPrice,
        finalPrice,
        discountAmount,
        discountLabel: discountAmount > 0 ? 'Flash Sale' : null,
      };
    }

    const { finalPrice, discountAmount } = applyDiscount(
      basePrice,
      product.discount_type ?? null,
      product.discount_value ?? null
    );

    return {
      originalPrice: basePrice,
      finalPrice,
      discountAmount,
      discountLabel: discountAmount > 0 ? 'Diskon' : null,
    };
  }, [priceOverride, originalPriceOverride, basePrice, product.discount_type, product.discount_value]);

  const stockValue =
    typeof stockOverride === 'number'
      ? stockOverride
      : typeof selectedVariant?.stock === 'number'
      ? selectedVariant?.stock
      : typeof product.stock === 'number'
      ? product.stock
      : null;

  const allDurationsOutOfStock = useMemo(() => {
    if (typeof stockOverride === 'number') {
      return stockOverride <= 0;
    }
    if (hasVariantSelector) {
      return durationOptions.every((option) => {
        const optionStock = getOptionStock(option);
        return optionStock !== null && optionStock <= 0;
      });
    }
    return stockValue !== null && stockValue <= 0;
  }, [stockOverride, hasVariantSelector, durationOptions, stockValue]);

  useEffect(() => {
    if (!hasVariantSelector || variantOverride) return;
    const selectedOption = durationOptions.find((option) => option.id === selectedVariantId);
    if (!selectedOption || isOptionAvailable(selectedOption)) return;
    const fallback = durationOptions.find((option) => isOptionAvailable(option));
    if (fallback) {
      setSelectedVariantId(fallback.id);
    }
  }, [hasVariantSelector, variantOverride, durationOptions, selectedVariantId]);

  const isOutOfStock = allDurationsOutOfStock;
  const isAddDisabled = disableAdd || isOutOfStock;
  const shouldHideAdd = hideAdd || isOutOfStock;
  const addButtonLabel = isOutOfStock
    ? 'Stok Habis'
    : disableAdd
    ? 'Flash Sale Belum Dimulai'
    : 'Tambah ke Keranjang';
  const stockLabel =
    isOutOfStock
      ? 'Stok habis'
      : stockValue === null
      ? 'Tersedia'
      : stockValue > 0
      ? `Sisa ${stockValue}`
      : 'Pilih durasi lain';

  const methodLabel = selectedVariant?.method ?? product.method ?? null;
  const methodText = methodLabel ? METHOD_LABELS[methodLabel] ?? methodLabel : null;
  const durationText = selectedVariant?.label ?? product.duration ?? 'Tidak tersedia';
  const warrantyText = selectedVariant?.warranty ?? product.warranty ?? 'Tidak ada informasi garansi.';

  const isNew = useMemo(() => {
    if (!product.created_at) return false;
    const created = new Date(product.created_at);
    if (Number.isNaN(created.getTime())) return false;
    const diff = Date.now() - created.getTime();
    return diff <= 3 * 24 * 60 * 60 * 1000;
  }, [product.created_at]);

  return (
    <>
      <div
        className={`group relative aspect-square w-full justify-self-start overflow-hidden bg-slate-100 transition ${
          compact ? 'max-w-[126px] sm:max-w-[170px]' : 'max-w-[220px]'
        } ${
          frameMode === 'embedded'
            ? 'rounded-[18px] border border-slate-200 shadow-none hover:-translate-y-0 hover:shadow-none'
            : 'rounded-3xl border border-white/70 shadow-soft hover:-translate-y-1 hover:shadow-2xl'
        }`}
      >
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/0" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 z-10"
          aria-label={`Lihat detail ${product.name}`}
        />

        <div className={`absolute inset-x-0 bottom-0 ${compact ? 'p-2 sm:p-2.5' : 'p-2 sm:p-3'}`}>
          <h3
            className={`line-clamp-2 font-semibold leading-tight text-white ${
              compact ? 'pr-10 text-[10px] sm:text-xs' : 'pr-12 text-[11px] sm:text-sm'
            }`}
          >
            {product.name}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div
              className={`font-semibold text-white/90 ${
                compact ? 'text-[10px] sm:text-[11px]' : 'text-[10px] sm:text-xs'
              }`}
            >
              {pricing.discountAmount > 0 ? (
                <div className="flex flex-col">
                  <span className="line-through text-white/60">
                    {formatRupiah(pricing.originalPrice)}
                  </span>
                  <span>{formatRupiah(pricing.finalPrice)}</span>
                </div>
              ) : (
                <span>{formatRupiah(pricing.finalPrice)}</span>
              )}
            </div>
          </div>
        </div>

        {stockValue !== null && (
          <div
            className={`absolute z-20 rounded-full border border-white/60 bg-white/85 font-semibold text-ink/80 shadow-sm backdrop-blur ${
              compact
                ? 'left-2 top-2 px-2 py-0.5 text-[9px] sm:left-2.5 sm:top-2.5 sm:px-2.5 sm:text-[10px]'
                : 'left-2 top-2 px-2.5 py-1 text-[10px] sm:left-3 sm:top-3'
            }`}
          >
            {stockLabel}
          </div>
        )}

        {isNew && (
          <div
            className={`absolute z-20 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-500 font-extrabold tracking-[0.18em] text-white shadow-md ring-1 ring-emerald-200/70 ${
              compact
                ? '-right-8 top-2 h-5 w-24 rotate-45 text-[8px] sm:-right-9 sm:top-2.5 sm:h-6 sm:w-28 sm:text-[9px]'
                : '-right-10 top-3 h-6 w-32 rotate-45 text-[9px] sm:-right-11 sm:top-3 sm:h-7 sm:w-36 sm:text-[10px]'
            }`}
          >
            BARU
          </div>
        )}

        {!shouldHideAdd && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isAddDisabled) return;
              onAdd(product, selectedVariant);
            }}
            disabled={isAddDisabled}
            className={`absolute z-20 grid place-items-center rounded-full border text-ink/80 shadow-sm backdrop-blur transition duration-150 ${
              compact
                ? 'bottom-2 right-2 h-8 w-8 sm:bottom-2.5 sm:right-2.5 sm:h-9 sm:w-9'
                : 'bottom-2 right-2 h-8 w-8 sm:bottom-3 sm:right-3 sm:h-9 sm:w-9'
            } ${
              isAddDisabled
                ? 'cursor-not-allowed border-slate-200 bg-white/60 text-slate-300'
                : 'border-white/70 bg-white/70 hover:border-white hover:bg-white active:scale-95'
            }`}
            aria-label={`Tambah ${product.name} ke keranjang`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={compact ? 'h-4 w-4' : 'h-4 w-4'}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
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

            <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl">
              <div className="grid max-h-[90vh] grid-rows-[auto,1fr] lg:max-h-[85vh] lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-1">
                <div className="relative bg-gradient-to-br from-slate-100 via-white to-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setActiveIndex(0);
                    }}
                    className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-xs font-semibold text-ink shadow transition hover:scale-105 active:scale-95"
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
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow transition hover:scale-105 active:scale-95"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow transition hover:scale-105 active:scale-95"
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
                          className={`h-12 w-12 overflow-hidden rounded-2xl border transition ${
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {product.category ?? 'Digital'}
                      </span>
                      {pricing.discountAmount > 0 && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Hemat {formatRupiah(pricing.discountAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Durasi
                      </div>
                      {hasVariantSelector ? (
                        <select
                          value={
                            selectedVariantId === null
                              ? 'base'
                              : String(selectedVariantId)
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'base') {
                              setSelectedVariantId(null);
                              return;
                            }
                            const nextId = value ? Number(value) : null;
                            setSelectedVariantId(Number.isNaN(nextId) ? null : nextId);
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink"
                        >
                          {durationOptions.map((option) => {
                            const optionStock = getOptionStock(option);
                            const suffix =
                              optionStock !== null && optionStock <= 0 ? ' (Habis)' : '';
                            const optionValue =
                              option.id === null ? 'base' : String(option.id);
                            return (
                              <option key={optionValue} value={optionValue}>
                                {option.label}
                                {suffix}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="mt-2 font-semibold text-ink">
                          {durationText}
                        </div>
                      )}
                    </div>
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
                          formatRupiah(pricing.finalPrice)
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Metode
                      </div>
                      <div className="mt-2 font-semibold text-ink">
                        {methodText ?? 'Belum ditentukan'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Garansi
                      </div>
                      <div className="mt-2 font-semibold text-ink">
                        {warrantyText}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Stok
                      </div>
                      <div className="mt-2 font-semibold text-ink">
                        {isOutOfStock
                          ? 'Stok habis'
                          : stockValue === null
                          ? 'Tersedia'
                          : stockValue > 0
                          ? `${stockValue} tersedia`
                          : 'Varian ini habis, pilih durasi lain.'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <div className="whitespace-pre-line">
                      {product.description?.trim() || 'Produk digital siap kirim via WhatsApp.'}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isAddDisabled) return;
                        onAdd(product, selectedVariant);
                        setOpen(false);
                      }}
                      disabled={isAddDisabled}
                      className={`rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
                        isAddDisabled
                          ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                          : 'bg-ink text-white shadow-ink/20 hover:-translate-y-0.5 hover:bg-slate-900 active:translate-y-0 active:scale-[0.99]'
                      }`}
                    >
                      {addButtonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-sm font-semibold text-slate-600 transition hover:text-ink"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
