'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Product } from '@/lib/types';
import { getPricing } from '@/lib/pricing';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type CartItem = {
  product_id: number;
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
  addItem: (product: Product, qty?: number, mode?: 'catalog' | 'flash') => void;
  updateQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
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

function getFlashPrice(product: Product): number {
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

  const addItem = (product: Product, qty = 1, mode: 'catalog' | 'flash' = 'catalog') => {
    const now = new Date();
    const flashActive = isFlashActive(product, now);

    const baseStock = typeof product.stock === 'number' ? product.stock : null;
    const flashStock =
      flashActive && mode === 'flash' && product.flash_sale_active
        ? getFlashRemaining(product)
        : null;
    // Katalog tetap mengikuti stok produk normal; flash card mengikuti stok flash.
    const effectiveStock = flashStock !== null ? flashStock : baseStock;
    const maxQty =
      flashActive && mode === 'flash' && product.max_qty_per_customer
        ? product.max_qty_per_customer
        : null;

    const useFlashPricing = flashActive && mode === 'flash';
    const flashPrice = useFlashPricing ? getFlashPrice(product) : null;
    const pricing = useFlashPricing && flashPrice !== null
      ? {
          originalPrice: product.price,
          finalPrice: flashPrice,
          discountAmount: Math.max(product.price - flashPrice, 0),
          discountLabel: 'Flash Sale',
        }
      : getPricing(product);

    const itemMode: 'catalog' | 'flash' = useFlashPricing ? 'flash' : 'catalog';

    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
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
            item.product_id === product.id
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
          item.product_id === product.id
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

  const updateQty = (productId: number, qty: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
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

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId));
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

            const baseStock = typeof product.stock === 'number' ? product.stock : null;
            const isFlashItem = item.mode === 'flash' || item.discountLabel === 'Flash Sale';

            if (isFlashItem) {
              const flashActive = isFlashActive(product, now);
              const flashRemaining = getFlashRemaining(product);
              if (!flashActive || (flashRemaining !== null && flashRemaining <= 0)) {
                changed = true;
                continue;
              }

              const maxQty = product.max_qty_per_customer ?? null;
              const flashFinalPrice = getFlashPrice(product);
              const pricing = {
                originalPrice: product.price,
                finalPrice: flashFinalPrice,
                discountAmount: Math.max(product.price - flashFinalPrice, 0),
                discountLabel: 'Flash Sale' as const,
              };

              let nextQty = item.qty;
              if (flashRemaining !== null) {
                nextQty = Math.min(nextQty, flashRemaining);
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
                stock: flashRemaining,
                maxQty,
                mode: 'flash',
                qty: nextQty,
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
                normalizedItem.mode !== item.mode
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

            const pricing = getPricing(product);
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
              normalizedItem.mode !== item.mode
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
