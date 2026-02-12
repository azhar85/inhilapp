'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { getPricing } from '@/lib/pricing';

export type CartItem = {
  product_id: number;
  name: string;
  price: number;
  originalPrice: number;
  discountAmount: number;
  discountLabel: string | null;
  image_url?: string | null;
  stock?: number | null;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
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
      const discountLabel =
        item.discountLabel ?? (discountAmount > 0 ? 'Diskon' : null);
      return {
        ...item,
        originalPrice,
        price,
        discountAmount,
        discountLabel,
        stock: item.stock ?? null,
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

  const clearVoucher = () => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherLabel(null);
  };

  const addItem = (product: Product, qty = 1) => {
    const pricing = getPricing(product);
    const stock = typeof product.stock === 'number' ? product.stock : null;
    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        const nextQty = existing.qty + qty;
        const cappedQty = stock === null ? nextQty : Math.min(nextQty, stock);
        if (cappedQty <= 0 || cappedQty === existing.qty) {
          return prev.map((item) =>
            item.product_id === product.id
              ? { ...item, stock: stock ?? item.stock ?? null }
              : item
          );
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                qty: cappedQty,
                stock: stock ?? item.stock ?? null,
              }
            : item
        );
      }

      if (stock !== null && stock <= 0) {
        return prev;
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
          stock,
          qty: stock === null ? qty : Math.min(qty, stock),
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
                qty:
                  item.stock === null || item.stock === undefined
                    ? qty
                    : Math.min(qty, item.stock),
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
