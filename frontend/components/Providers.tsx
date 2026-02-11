'use client';

import { CartProvider } from '@/hooks/useCart';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
