import type { Product } from './types';

export type PricingResult = {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountLabel: string | null;
};

export function getPricing(product: Product): PricingResult {
  const originalPrice = product.price;
  const type = product.discount_type ?? null;
  const value = product.discount_value ?? 0;

  if (!type || value <= 0) {
    return {
      originalPrice,
      finalPrice: originalPrice,
      discountAmount: 0,
      discountLabel: null,
    };
  }

  let discountAmount = 0;
  if (type === 'PERCENT') {
    discountAmount = Math.round(originalPrice * (value / 100));
  } else if (type === 'FIXED') {
    discountAmount = value;
  }

  if (discountAmount < 0) discountAmount = 0;
  if (discountAmount > originalPrice) discountAmount = originalPrice;

  const finalPrice = originalPrice - discountAmount;
  const discountLabel =
    type === 'PERCENT' ? `Diskon ${value}%` : `Diskon Rp${value.toLocaleString('id-ID')}`;

  return { originalPrice, finalPrice, discountAmount, discountLabel };
}
