'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Product, ProductVariant } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type CartItem = {
  product_id: number;
  variant_id?: number | null;
  variant_label?: string | null;
  duration?: string | null;
  warranty?: string | null;
  method?: string | null;
  name: string;
  price: number;
  originalPrice: number;
  discountAmount: number;
  discountLabel: string | null;
  image_url?: string | null;
  stock?: number | null;
  maxQty?: number | null;
  mode?: 'catalog' | 'flash';
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    product: Product,
    qty?: number,
    mode?: 'catalog' | 'flash',
    variant?: ProductVariant | null
  ) => void;
  updateQty: (productId: number, variantId: number | null, qty: number) => void;
  removeItem: (productId: number, variantId: number | null) => void;
  clear: () => void;
  total: number;
  subtotal: number;
  discountTotal: number;
  voucherCode: string;
  voucherDiscount: number;
  voucherLabel: string | null;
  totalAfterVoucher: number;
  applyVoucher: (code: string, discount: number, label: string | null) => void;
  clearVoucher: () => void;
  count: number;
  isReady: boolean;
};

const STORAGE_KEY = 'inhilapp_cart_v2';

const normalizeVariantId = (id?: number | null) => (id ? Number(id) : null);

function applyDiscount(
  basePrice: number,
  type?: 'PERCENT' | 'FIXED' | null,
  value?: number | null
): number {
  if (!type || !value || value <= 0) return basePrice;
  let discount = 0;
  if (type === 'PERCENT') {
    discount = Math.round(basePrice * (value / 100));
  } else if (type === 'FIXED') {
    discount = value;
  }
  if (discount < 0) discount = 0;
  if (discount > basePrice) discount = basePrice;
  return basePrice - discount;
}

function getFlashPrice(product: Product, basePrice: number): number {
  const original = basePrice;
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
}

function isFlashActive(product: Product, now: Date): boolean {
  const flashStart = product.flash_sale_start_at
    ? new Date(product.flash_sale_start_at)
    : null;
  const flashEnd = product.flash_sale_end_at ? new Date(product.flash_sale_end_at) : null;

  return Boolean(
    product.flash_sale_active &&
      (!flashStart || now >= flashStart) &&
      (!flashEnd || now <= flashEnd)
  );
}

function getFlashRemaining(product: Product): number | null {
  if (typeof product.flash_sale_remaining === 'number') {
    return product.flash_sale_remaining;
  }
  if (typeof product.flash_sale_stock === 'number') {
    return product.flash_sale_stock;
  }
  return null;
}

type StoredVoucher = {
  code: string;
  discount: number;
  label: string | null;
};

type StoredCart = {
  items: CartItem[];
  voucher?: StoredVoucher | null;
};
const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): StoredCart {
  if (typeof window === 'undefined') {
    return { items: [], voucher: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], voucher: null };
    const parsed = JSON.parse(raw) as StoredCart | CartItem[];
    const stored = Array.isArray(parsed) ? { items: parsed } : parsed;
    const normalizedItems = (stored.items ?? []).map((item) => {
      const originalPrice = item.originalPrice ?? item.price ?? 0;
      const price = item.price ?? originalPrice;
      const discountAmount =
        item.discountAmount ?? Math.max(originalPrice - price, 0);
      const discountLabel = item.discountLabel ?? (discountAmount > 0 ? 'Diskon' : null);
      return {
        ...item,
        variant_id: normalizeVariantId(item.variant_id),
        originalPrice,
        price,
        discountAmount,
        discountLabel,
        stock: item.stock ?? null,
        maxQty: item.maxQty ?? null,
        mode:
          item.mode ?? (item.discountLabel === 'Flash Sale' ? 'flash' : 'catalog'),
      };
    });
    return { items: normalizedItems, voucher: stored.voucher ?? null };
  } catch {
    return { items: [], voucher: null };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherLabel, setVoucherLabel] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadCart();
    setItems(stored.items);
    if (stored.voucher) {
      setVoucherCode(stored.voucher.code);
      setVoucherDiscount(stored.voucher.discount);
      setVoucherLabel(stored.voucher.label ?? null);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const stored: StoredCart = {
      items,
      voucher: voucherCode
        ? { code: voucherCode, discount: voucherDiscount, label: voucherLabel }
        : null,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [items, voucherCode, voucherDiscount, voucherLabel, isReady]);

  const clearVoucher = useCallback(() => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherLabel(null);
  }, []);

  const addItem = (
    product: Product,
    qty = 1,
    mode: 'catalog' | 'flash' = 'catalog',
    variant: ProductVariant | null = null
  ) => {
    const now = new Date();
    const flashActive = isFlashActive(product, now);
    const variantId = normalizeVariantId(variant?.id);
    const flashVariantId = normalizeVariantId(product.flash_sale_variant_id ?? null);
    const flashVariantMatch =
      flashVariantId === null ? variantId === null : flashVariantId === variantId;

    const basePrice = variant?.price ?? product.price;
    const baseStock =
      typeof variant?.stock === 'number'
        ? variant?.stock
        : typeof product.stock === 'number'
        ? product.stock
        : null;
    const flashStock =
      flashActive &&
      mode === 'flash' &&
      product.flash_sale_active &&
      flashVariantMatch
        ? getFlashRemaining(product)
        : null;
    // Flash sale pakai stok flash sendiri (tanpa ambil stok katalog).
    const effectiveStock = flashStock !== null ? flashStock : baseStock;
    const maxQty =
      flashActive &&
      mode === 'flash' &&
      flashVariantMatch &&
      product.max_qty_per_customer
        ? product.max_qty_per_customer
        : null;

    const useFlashPricing = flashActive && mode === 'flash' && flashVariantMatch;
    const flashPrice = useFlashPricing ? getFlashPrice(product, basePrice) : null;
    const pricing = useFlashPricing && flashPrice !== null
      ? {
          originalPrice: basePrice,
          finalPrice: flashPrice,
          discountAmount: Math.max(basePrice - flashPrice, 0),
          discountLabel: 'Flash Sale',
        }
      : (() => {
          const finalPrice = applyDiscount(
            basePrice,
            product.discount_type ?? null,
            product.discount_value ?? null
          );
          const discountAmount = Math.max(basePrice - finalPrice, 0);
          return {
            originalPrice: basePrice,
            finalPrice,
            discountAmount,
            discountLabel: discountAmount > 0 ? 'Diskon' : null,
          };
        })();

    const itemMode: 'catalog' | 'flash' = useFlashPricing ? 'flash' : 'catalog';

    setItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.product_id === product.id &&
          normalizeVariantId(item.variant_id) === variantId
      );
      if (existing) {
        const nextQty = existing.qty + qty;
        let cappedQty = nextQty;
        if (effectiveStock !== null) {
          cappedQty = Math.min(cappedQty, effectiveStock);
        }
        if (maxQty !== null) {
          cappedQty = Math.min(cappedQty, maxQty);
        }
        if (cappedQty <= 0 || cappedQty === existing.qty) {
          return prev.map((item) =>
            item.product_id === product.id &&
            normalizeVariantId(item.variant_id) === variantId
              ? {
                  ...item,
                  stock: effectiveStock ?? item.stock ?? null,
                  maxQty: maxQty ?? item.maxQty ?? null,
                  mode: itemMode,
                }
              : item
          );
        }
        return prev.map((item) =>
          item.product_id === product.id &&
          normalizeVariantId(item.variant_id) === variantId
            ? {
                ...item,
                price: pricing.finalPrice,
                originalPrice: pricing.originalPrice,
                discountAmount: pricing.discountAmount,
                discountLabel: pricing.discountLabel,
                qty: cappedQty,
                stock: effectiveStock ?? item.stock ?? null,
                maxQty: maxQty ?? item.maxQty ?? null,
                mode: itemMode,
              }
            : item
        );
      }

      if (effectiveStock !== null && effectiveStock <= 0) {
        return prev;
      }

      let startQty = qty;
      if (effectiveStock !== null) {
        startQty = Math.min(startQty, effectiveStock);
      }
      if (maxQty !== null) {
        startQty = Math.min(startQty, maxQty);
      }

      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variantId,
          variant_label: variant?.label ?? null,
          duration: variant?.label ?? product.duration ?? null,
          warranty: variant?.warranty ?? product.warranty ?? null,
          method: variant?.method ?? product.method ?? null,
          name: product.name,
          price: pricing.finalPrice,
          originalPrice: pricing.originalPrice,
          discountAmount: pricing.discountAmount,
          discountLabel: pricing.discountLabel,
          image_url: product.image_url ?? null,
          stock: effectiveStock,
          maxQty,
          mode: itemMode,
          qty: startQty,
        },
      ];
    });
    clearVoucher();
  };

  const updateQty = (productId: number, variantId: number | null, qty: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId &&
          normalizeVariantId(item.variant_id) === normalizeVariantId(variantId)
            ? {
                ...item,
                qty: (() => {
                  let nextQty = qty;
                  if (item.stock !== null && item.stock !== undefined) {
                    nextQty = Math.min(nextQty, item.stock);
                  }
                  if (item.maxQty !== null && item.maxQty !== undefined) {
                    nextQty = Math.min(nextQty, item.maxQty);
                  }
                  return nextQty;
                })(),
              }
            : item
        )
        .filter((item) => item.qty > 0)
    );
    clearVoucher();
  };

  const removeItem = (productId: number, variantId: number | null) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product_id === productId &&
            normalizeVariantId(item.variant_id) === normalizeVariantId(variantId)
          )
      )
    );
    clearVoucher();
  };

  const clear = () => {
    setItems([]);
    clearVoucher();
  };

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    let syncing = false;

    const syncCartWithProducts = async () => {
      if (syncing || cancelled) return;
      syncing = true;

      try {
        const response = await fetch(`${API_BASE}/api/products`, {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const products = (await response.json()) as Product[];
        if (cancelled) return;

        const productMap = new Map<number, Product>(products.map((product) => [product.id, product]));
        let changed = false;

        setItems((prev) => {
          if (prev.length === 0) return prev;

          const now = new Date();
          const next: CartItem[] = [];

          for (const item of prev) {
            const product = productMap.get(item.product_id);
            if (!product || !product.is_active) {
              changed = true;
              continue;
            }

            const variantId = normalizeVariantId(item.variant_id);
            const variant = variantId
              ? product.variants?.find((entry) => entry.id === variantId) ?? null
              : null;

            if (variantId && (!variant || variant.is_active === false)) {
              changed = true;
              continue;
            }

            const basePrice = variant?.price ?? product.price;
            const baseStock =
              typeof variant?.stock === 'number'
                ? variant?.stock
                : typeof product.stock === 'number'
                ? product.stock
                : null;

            const isFlashItem = item.mode === 'flash' || item.discountLabel === 'Flash Sale';

            if (isFlashItem) {
              const flashActive = isFlashActive(product, now);
              const flashVariantId = normalizeVariantId(
                product.flash_sale_variant_id ?? null
              );
              const flashVariantMatch =
                flashVariantId === null
                  ? variantId === null
                  : flashVariantId === variantId;
              const flashRemaining = getFlashRemaining(product);
              if (
                !flashActive ||
                !flashVariantMatch ||
                (flashRemaining !== null && flashRemaining <= 0)
              ) {
                changed = true;
                continue;
              }

              const maxQty = product.max_qty_per_customer ?? null;
              const flashFinalPrice = getFlashPrice(product, basePrice);
              const pricing = {
                originalPrice: basePrice,
                finalPrice: flashFinalPrice,
                discountAmount: Math.max(basePrice - flashFinalPrice, 0),
                discountLabel: 'Flash Sale' as const,
              };

              let nextQty = item.qty;
              const effectiveStock = flashRemaining !== null ? flashRemaining : null;

              if (effectiveStock !== null) {
                nextQty = Math.min(nextQty, effectiveStock);
              }
              if (maxQty !== null) {
                nextQty = Math.min(nextQty, maxQty);
              }

              if (nextQty <= 0) {
                changed = true;
                continue;
              }

              const normalizedItem: CartItem = {
                ...item,
                name: product.name,
                image_url: product.image_url ?? null,
                price: pricing.finalPrice,
                originalPrice: pricing.originalPrice,
                discountAmount: pricing.discountAmount,
                discountLabel: pricing.discountLabel,
                stock: effectiveStock,
                maxQty,
                mode: 'flash',
                qty: nextQty,
                variant_id: variantId,
                variant_label: variant?.label ?? null,
                duration: variant?.label ?? product.duration ?? null,
                warranty: variant?.warranty ?? product.warranty ?? null,
                method: variant?.method ?? product.method ?? null,
              };

              if (
                normalizedItem.name !== item.name ||
                normalizedItem.image_url !== item.image_url ||
                normalizedItem.price !== item.price ||
                normalizedItem.originalPrice !== item.originalPrice ||
                normalizedItem.discountAmount !== item.discountAmount ||
                normalizedItem.discountLabel !== item.discountLabel ||
                normalizedItem.stock !== item.stock ||
                normalizedItem.maxQty !== item.maxQty ||
                normalizedItem.qty !== item.qty ||
                normalizedItem.mode !== item.mode ||
                normalizedItem.variant_id !== item.variant_id
              ) {
                changed = true;
              }

              next.push(normalizedItem);
              continue;
            }

            let nextQty = item.qty;
            if (baseStock !== null) {
              nextQty = Math.min(nextQty, baseStock);
            }

            if (nextQty <= 0) {
              changed = true;
              continue;
            }

            const finalPrice = applyDiscount(
              basePrice,
              product.discount_type ?? null,
              product.discount_value ?? null
            );
            const pricing = {
              originalPrice: basePrice,
              finalPrice,
              discountAmount: Math.max(basePrice - finalPrice, 0),
              discountLabel: Math.max(basePrice - finalPrice, 0) > 0 ? 'Diskon' : null,
            };
            const normalizedItem: CartItem = {
              ...item,
              name: product.name,
              image_url: product.image_url ?? null,
              price: pricing.finalPrice,
              originalPrice: pricing.originalPrice,
              discountAmount: pricing.discountAmount,
              discountLabel: pricing.discountLabel,
              stock: baseStock,
              maxQty: null,
              mode: 'catalog',
              qty: nextQty,
              variant_id: variantId,
              variant_label: variant?.label ?? null,
              duration: variant?.label ?? product.duration ?? null,
              warranty: variant?.warranty ?? product.warranty ?? null,
              method: variant?.method ?? product.method ?? null,
            };

            if (
              normalizedItem.name !== item.name ||
              normalizedItem.image_url !== item.image_url ||
              normalizedItem.price !== item.price ||
              normalizedItem.originalPrice !== item.originalPrice ||
              normalizedItem.discountAmount !== item.discountAmount ||
              normalizedItem.discountLabel !== item.discountLabel ||
              normalizedItem.stock !== item.stock ||
              normalizedItem.maxQty !== item.maxQty ||
              normalizedItem.qty !== item.qty ||
              normalizedItem.mode !== item.mode ||
              normalizedItem.variant_id !== item.variant_id
            ) {
              changed = true;
            }

            next.push(normalizedItem);
          }

          if (!changed) return prev;
          return next;
        });

        if (changed && !cancelled) {
          clearVoucher();
        }
      } catch {
        // Keep cart as-is when product sync fails (offline/backend down).
      } finally {
        syncing = false;
      }
    };

    void syncCartWithProducts();

    const intervalId = window.setInterval(() => {
      void syncCartWithProducts();
    }, 20000);

    const onFocus = () => {
      void syncCartWithProducts();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncCartWithProducts();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isReady, clearVoucher]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.originalPrice ?? item.price) * item.qty,
        0
      ),
    [items]
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  const discountTotal = useMemo(() => Math.max(subtotal - total, 0), [subtotal, total]);

  const totalAfterVoucher = useMemo(
    () => Math.max(total - voucherDiscount, 0),
    [total, voucherDiscount]
  );

  const applyVoucher = (code: string, discount: number, label: string | null) => {
    setVoucherCode(code);
    setVoucherDiscount(discount);
    setVoucherLabel(label);
  };

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQty,
      removeItem,
      clear,
      total,
      subtotal,
      discountTotal,
      voucherCode,
      voucherDiscount,
      voucherLabel,
      totalAfterVoucher,
      applyVoucher,
      clearVoucher,
      count,
      isReady,
    }),
    [
      items,
      total,
      subtotal,
      discountTotal,
      voucherCode,
      voucherDiscount,
      voucherLabel,
      totalAfterVoucher,
      count,
      isReady,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
