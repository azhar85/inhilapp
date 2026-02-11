'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Order, Product, Stock, Voucher } from '@/lib/types';
import { formatRupiah } from '@/lib/formatRupiah';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const ADMIN_TOKEN_KEY = 'inhilapp_admin_token';

type TabKey = 'products' | 'orders' | 'vouchers' | 'stocks';

type ProductFormState = {
  id?: number;
  name: string;
  price: string;
  category: string;
  description: string;
  duration: string;
  warranty: string;
  discount_type: '' | 'PERCENT' | 'FIXED';
  discount_value: string;
  is_active: boolean;
};

type VoucherFormState = {
  id?: number;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  max_discount: string;
  min_order: string;
  usage_limit: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

type StockFormState = {
  id?: number;
  product_id: string;
  active_date: string;
  end_date: string;
  duration: string;
  warranty: string;
  account: string;
  username: string;
  password: string;
  link: string;
  description: string;
  is_active: boolean;
};

const defaultProductForm: ProductFormState = {
  name: '',
  price: '',
  category: '',
  description: '',
  duration: '',
  warranty: '',
  discount_type: '',
  discount_value: '',
  is_active: true,
};

const defaultVoucherForm: VoucherFormState = {
  code: '',
  type: 'PERCENT',
  value: '',
  max_discount: '',
  min_order: '',
  usage_limit: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

const defaultStockForm: StockFormState = {
  product_id: '',
  active_date: '',
  end_date: '',
  duration: '',
  warranty: '',
  account: '',
  username: '',
  password: '',
  link: '',
  description: '',
  is_active: true,
};

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm);
  const [voucherForm, setVoucherForm] = useState<VoucherFormState>(defaultVoucherForm);
  const [stockForm, setStockForm] = useState<StockFormState>(defaultStockForm);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [clearGallery, setClearGallery] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('Semua');
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [isEditingVoucher, setIsEditingVoucher] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [stockDetail, setStockDetail] = useState<Stock | null>(null);
  const filterActiveProducts = (items: Product[]) =>
    items.filter((item) => item.is_active !== false);

  const orderFilters = useMemo(() => {
    const params = new URLSearchParams();
    if (orderQuery.trim()) params.set('q', orderQuery.trim());
    if (orderStatus !== 'Semua') params.set('status', orderStatus);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [orderQuery, orderStatus]);

  const orderPageSize = 6;
  const orderPageCount = Math.max(1, Math.ceil(orders.length / orderPageSize));
  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return orders.slice(start, start + orderPageSize);
  }, [orders, orderPage]);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!stored) {
      router.replace('/admin/login');
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [productRes, orderRes, voucherRes, stockRes] = await Promise.all([
          adminFetch(`${API_BASE}/api/admin/products`),
          adminFetch(`${API_BASE}/api/admin/orders`),
          adminFetch(`${API_BASE}/api/admin/vouchers`),
          adminFetch(`${API_BASE}/api/admin/stocks`),
        ]);

        if (!productRes.ok || !orderRes.ok || !voucherRes.ok || !stockRes.ok) {
          throw new Error('Gagal memuat data admin.');
        }

        const [productData, orderData, voucherData, stockData] = await Promise.all([
          productRes.json(),
          orderRes.json(),
          voucherRes.json(),
          stockRes.json(),
        ]);

        setProducts(filterActiveProducts(productData));
        setOrders(orderData);
        setVouchers(voucherData);
        setStocks(stockData);
      } catch (err) {
        setError('Data admin gagal dimuat. Coba refresh.');
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    async function loadOrders() {
      try {
        const response = await adminFetch(
          `${API_BASE}/api/admin/orders${orderFilters}`
        );
        if (!response.ok) {
          throw new Error('Gagal memuat order.');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError('Order gagal dimuat.');
      }
    }

    loadOrders();
  }, [orderFilters, token]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderFilters, orders.length]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const adminFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      router.replace('/admin/login');
    }
    return response;
  };

  const resetProductForm = () => {
    setProductForm(defaultProductForm);
    setCoverFile(null);
    setGalleryFiles([]);
    setExistingCover(null);
    setExistingGallery([]);
    setClearGallery(false);
    setRemoveCover(false);
    setIsEditingProduct(false);
  };

  const resetVoucherForm = () => {
    setVoucherForm(defaultVoucherForm);
    setIsEditingVoucher(false);
  };
  const resetStockForm = () => {
    setStockForm(defaultStockForm);
    setIsEditingStock(false);
  };

  const handleSaveProduct = async () => {
    if (actionLoading) return;
    setActionLoading(
      productForm.id ? 'Menyimpan perubahan produk...' : 'Menyimpan produk...'
    );
    setError(null);

    try {
      const isEdit = Boolean(productForm.id);
      const url = isEdit
        ? `${API_BASE}/api/admin/products/${productForm.id}`
        : `${API_BASE}/api/admin/products`;
      const method = 'POST';

      const formData = new FormData();
      formData.append('name', productForm.name.trim());
      formData.append('price', String(Number(productForm.price || 0)));
      if (productForm.category.trim())
        formData.append('category', productForm.category.trim());
      if (productForm.description.trim())
        formData.append('description', productForm.description.trim());
      if (productForm.duration.trim())
        formData.append('duration', productForm.duration.trim());
      if (productForm.warranty.trim())
        formData.append('warranty', productForm.warranty.trim());
      if (productForm.discount_type) formData.append('discount_type', productForm.discount_type);
      if (productForm.discount_value)
        formData.append('discount_value', productForm.discount_value);
      formData.append('is_active', productForm.is_active ? '1' : '0');

      if (!coverFile && existingCover && !removeCover) {
        formData.append('image_url', existingCover);
      }

      if (existingGallery.length > 0) {
        existingGallery.forEach((image) => formData.append('product_images[]', image));
      }

      const coverSource = coverFile ?? galleryFiles[0] ?? null;
      const gallerySource = coverFile ? galleryFiles : galleryFiles.slice(1);

      if (coverSource) {
        formData.append('image', coverSource);
      }

      if (gallerySource.length > 0) {
        gallerySource.forEach((file) => formData.append('gallery[]', file));
      }

      if (clearGallery) {
        formData.append('clear_gallery', '1');
      }

      if (removeCover) {
        formData.append('remove_image', '1');
      }

      if (isEdit) {
        formData.append('_method', 'PUT');
      }

      const response = await adminFetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        setError('Gagal menyimpan produk.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/products`);
      setProducts(filterActiveProducts(await refreshed.json()));
      resetProductForm();
      setShowProductModal(false);
      setSuccessMessage('Produk tersimpan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      id: product.id,
      name: product.name ?? '',
      price: String(product.price ?? ''),
      category: product.category ?? '',
      description: product.description ?? '',
      duration: product.duration ?? '',
      warranty: product.warranty ?? '',
      discount_type: product.discount_type ?? '',
      discount_value: product.discount_value ? String(product.discount_value) : '',
      is_active: product.is_active ?? true,
    });
    if (product.image_url) {
      setExistingCover(product.image_url);
      setExistingGallery(product.product_images ?? []);
    } else if (product.product_images && product.product_images.length > 0) {
      const [first, ...rest] = product.product_images;
      setExistingCover(first);
      setExistingGallery(rest);
    } else {
      setExistingCover(null);
      setExistingGallery([]);
    }
    setCoverFile(null);
    setGalleryFiles([]);
    setClearGallery(false);
    setRemoveCover(false);
    setIsEditingProduct(true);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!productId) return;
    if (!window.confirm('Hapus produk ini?')) return;
    if (actionLoading) return;
    setActionLoading('Menghapus produk...');
    setError(null);
    try {
      const deletePayload = new FormData();
      deletePayload.append('_method', 'DELETE');

      const response = await adminFetch(`${API_BASE}/api/admin/products/${productId}`, {
        method: 'POST',
        body: deletePayload,
      });

      if (!response.ok) {
        setError('Gagal menghapus produk.');
        return;
      }

      const payload = await response.json();
      if (payload?.action === 'deactivated') {
        setProducts((prev) => prev.filter((item) => item.id !== productId));
        setSuccessMessage(payload.message ?? 'Produk dinonaktifkan.');
      } else {
        setProducts((prev) => prev.filter((item) => item.id !== productId));
        setSuccessMessage(payload?.message ?? 'Produk dihapus.');
      }
      resetProductForm();
      setShowProductModal(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrder = async (order: Order) => {
    if (actionLoading) return;
    setActionLoading('Menyimpan order...');
    setError(null);
    try {
      const response = await adminFetch(`${API_BASE}/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          fulfillment_account: order.fulfillment_account ?? null,
          fulfillment_email: order.fulfillment_email ?? null,
          fulfillment_password: order.fulfillment_password ?? null,
          fulfillment_link: order.fulfillment_link ?? null,
          fulfillment_notes: order.fulfillment_notes ?? null,
        }),
      });

      if (!response.ok) {
        setError('Gagal memperbarui order.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/orders${orderFilters}`);
      const data = await refreshed.json();
      setOrders(data);
      setSuccessMessage('Order tersimpan.');
      setOrderModal(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveVoucher = async () => {
    if (actionLoading) return;
    setActionLoading('Menyimpan voucher...');
    setError(null);
    try {
      const payload = {
        code: voucherForm.code.trim(),
        type: voucherForm.type,
        value: Number(voucherForm.value || 0),
        max_discount: voucherForm.max_discount ? Number(voucherForm.max_discount) : null,
        min_order: voucherForm.min_order ? Number(voucherForm.min_order) : null,
        usage_limit: voucherForm.usage_limit ? Number(voucherForm.usage_limit) : null,
        starts_at: voucherForm.starts_at || null,
        ends_at: voucherForm.ends_at || null,
        is_active: voucherForm.is_active,
      };

      const isEdit = Boolean(voucherForm.id);
      const url = isEdit
        ? `${API_BASE}/api/admin/vouchers/${voucherForm.id}`
        : `${API_BASE}/api/admin/vouchers`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError('Gagal menyimpan voucher.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/vouchers`);
      setVouchers(await refreshed.json());
      resetVoucherForm();
      setShowVoucherModal(false);
      setSuccessMessage('Voucher tersimpan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditVoucher = (voucher: Voucher) => {
    setVoucherForm({
      id: voucher.id,
      code: voucher.code ?? '',
      type: voucher.type ?? 'PERCENT',
      value: String(voucher.value ?? ''),
      max_discount: voucher.max_discount ? String(voucher.max_discount) : '',
      min_order: voucher.min_order ? String(voucher.min_order) : '',
      usage_limit: voucher.usage_limit ? String(voucher.usage_limit) : '',
      starts_at: voucher.starts_at ? voucher.starts_at.slice(0, 10) : '',
      ends_at: voucher.ends_at ? voucher.ends_at.slice(0, 10) : '',
      is_active: voucher.is_active ?? true,
    });
    setIsEditingVoucher(true);
    setShowVoucherModal(true);
  };

  const handleDeleteVoucher = async (voucherId: number) => {
    if (actionLoading) return;
    setActionLoading('Menghapus voucher...');
    setError(null);
    try {
      const deletePayload = new FormData();
      deletePayload.append('_method', 'DELETE');

      const response = await adminFetch(`${API_BASE}/api/admin/vouchers/${voucherId}`, {
        method: 'POST',
        body: deletePayload,
      });

      if (!response.ok) {
        setError('Gagal menghapus voucher.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/vouchers`);
      setVouchers(await refreshed.json());
      resetVoucherForm();
      setShowVoucherModal(false);
      setSuccessMessage('Voucher dihapus.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveStock = async () => {
    if (actionLoading) return;
    setActionLoading(stockForm.id ? 'Menyimpan perubahan stock...' : 'Menyimpan stock...');
    setError(null);
    try {
      if (!stockForm.product_id) {
        setError('Produk wajib dipilih.');
        return;
      }
      const selectedProduct = products.find(
        (item) => item.id === Number(stockForm.product_id)
      );
      if (!selectedProduct) {
        setError('Produk tidak ditemukan.');
        return;
      }
      const payload = {
        product_id: Number(stockForm.product_id),
        name: selectedProduct.name,
        active_date: stockForm.active_date,
        end_date: stockForm.end_date,
        duration: stockForm.duration.trim(),
        warranty: stockForm.warranty.trim(),
        account: stockForm.account.trim() || null,
        username: stockForm.username.trim() || null,
        password: stockForm.password.trim() || null,
        link: stockForm.link.trim() || null,
        description: stockForm.description.trim() || null,
        is_active: stockForm.is_active,
      };

      const isEdit = Boolean(stockForm.id);
      const url = isEdit
        ? `${API_BASE}/api/admin/stocks/${stockForm.id}`
        : `${API_BASE}/api/admin/stocks`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError('Gagal menyimpan stock.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/stocks`);
      setStocks(await refreshed.json());
      resetStockForm();
      setShowStockModal(false);
      setSuccessMessage('Stock tersimpan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditStock = (stock: Stock) => {
    setStockForm({
      id: stock.id,
      product_id: stock.product_id ? String(stock.product_id) : '',
      active_date: stock.active_date ? stock.active_date.slice(0, 10) : '',
      end_date: stock.end_date ? stock.end_date.slice(0, 10) : '',
      duration: stock.duration ?? '',
      warranty: stock.warranty ?? '',
      account: stock.account ?? '',
      username: stock.username ?? '',
      password: stock.password ?? '',
      link: stock.link ?? '',
      description: stock.description ?? '',
      is_active: stock.is_active ?? true,
    });
    setIsEditingStock(true);
    setShowStockModal(true);
  };

  const handleDeleteStock = async (stockId: number) => {
    if (!stockId) return;
    if (!window.confirm('Hapus stock ini?')) return;
    if (actionLoading) return;
    setActionLoading('Menghapus stock...');
    setError(null);
    try {
      const deletePayload = new FormData();
      deletePayload.append('_method', 'DELETE');

      const response = await adminFetch(`${API_BASE}/api/admin/stocks/${stockId}`, {
        method: 'POST',
        body: deletePayload,
      });

      if (!response.ok) {
        setError('Gagal menghapus stock.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/stocks`);
      setStocks(await refreshed.json());
      resetStockForm();
      setShowStockModal(false);
      setSuccessMessage('Stock dihapus.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStockStatus = async (stock: Stock) => {
    if (actionLoading) return;
    setActionLoading('Mengubah status stock...');
    setError(null);
    try {
      const payload = {
        product_id: stock.product_id,
        name: stock.name,
        active_date: stock.active_date,
        end_date: stock.end_date,
        duration: stock.duration,
        warranty: stock.warranty,
        account: stock.account ?? null,
        username: stock.username ?? null,
        password: stock.password ?? null,
        link: stock.link ?? null,
        description: stock.description ?? null,
        is_active: !stock.is_active,
      };
      const response = await adminFetch(`${API_BASE}/api/admin/stocks/${stock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError('Gagal memperbarui status stock.');
        return;
      }

      const refreshed = await adminFetch(`${API_BASE}/api/admin/stocks`);
      setStocks(await refreshed.json());
      setSuccessMessage('Status stock diperbarui.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch(`${API_BASE}/api/admin/logout`, { method: 'POST' });
    } finally {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      router.replace('/admin/login');
    }
  };

  const voucherValuePreview = voucherForm.value
    ? voucherForm.type === 'PERCENT'
      ? `${voucherForm.value}%`
      : formatRupiah(Number(voucherForm.value))
    : '-';
  const isBusy = Boolean(actionLoading);
  const formatDateOnly = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10);
    }
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };
  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };
  const isStockActive = (stock: Stock) => Boolean(stock.is_active);
  const stockProductLabel = useMemo(() => {
    if (!stockForm.product_id) {
      const fromStock = stocks.find((item) => item.id === stockForm.id)?.product?.name;
      return fromStock ?? 'Pilih produk';
    }
    const id = Number(stockForm.product_id);
    return (
      products.find((item) => item.id === id)?.name ??
      stocks.find((item) => item.id === stockForm.id)?.product?.name ??
      `Produk #${stockForm.product_id}`
    );
  }, [stockForm.product_id, stockForm.id, products, stocks]);
  const existingProductImages = [
    ...(existingCover ? [existingCover] : []),
    ...existingGallery,
  ];
  const selectedProductImages = [
    ...(coverFile ? [coverFile] : []),
    ...galleryFiles,
  ];
  const showExistingImages = existingProductImages.length > 0 && !clearGallery;
  const handleSelectProductImages = (files: File[]) => {
    if (files.length === 0) return;
    if (!existingCover && !coverFile) {
      const [first, ...rest] = files;
      setCoverFile(first ?? null);
      setGalleryFiles((prev) => [...prev, ...rest]);
      return;
    }
    setGalleryFiles((prev) => [...prev, ...files]);
  };
  const handleSetCoverIndex = (index: number) => {
    if (index <= 0) return;
    const current = [
      ...(coverFile ? [coverFile] : []),
      ...galleryFiles,
    ];
    const picked = current[index];
    if (!picked) return;
    const next = [picked, ...current.slice(0, index), ...current.slice(index + 1)];
    setCoverFile(next[0] ?? null);
    setGalleryFiles(next.slice(1));
  };
  const handleRemoveSelectedImage = (index: number) => {
    const current = [
      ...(coverFile ? [coverFile] : []),
      ...galleryFiles,
    ];
    const next = current.filter((_, i) => i !== index);
    setCoverFile(next[0] ?? null);
    setGalleryFiles(next.slice(1));
  };
  const handleSetExistingCover = (index: number) => {
    if (!existingCover || index <= 0) return;
    const galleryIndex = index - 1;
    const nextCover = existingGallery[galleryIndex];
    if (!nextCover) return;
    const nextGallery = existingGallery.filter((_, i) => i !== galleryIndex);
    nextGallery.unshift(existingCover);
    setExistingCover(nextCover);
    setExistingGallery(nextGallery);
    setRemoveCover(false);
  };
  const handleRemoveExistingImage = (index: number) => {
    if (existingCover && index === 0) {
      if (existingGallery.length > 0) {
        const [nextCover, ...rest] = existingGallery;
        setExistingCover(nextCover);
        setExistingGallery(rest);
        setRemoveCover(false);
      } else {
        setExistingCover(null);
        setRemoveCover(true);
      }
      return;
    }

    const galleryIndex = existingCover ? index - 1 : index;
    setExistingGallery((prev) => prev.filter((_, i) => i !== galleryIndex));
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Panel Admin</h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola produk, order, dan voucher dengan aman.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['products', 'orders', 'vouchers', 'stocks'] as TabKey[]).map(
              (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-ink text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab === 'products' && 'Produk'}
                {tab === 'orders' && 'Order'}
                {tab === 'vouchers' && 'Voucher'}
                {tab === 'stocks' && 'Stock'}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-slate-600">Memuat data admin...</p>
      )}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {activeTab === 'products' && (
        <section className="mt-8">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Daftar Produk</h2>
              <button
                type="button"
                onClick={() => {
                  resetProductForm();
                  setShowProductModal(true);
                }}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Tambah Produk
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleEditProduct(product)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">{product.name}</div>
                    <div className="text-xs text-slate-500">
                      {product.category ?? 'Tanpa kategori'} - {formatRupiah(product.price)}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      product.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {product.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'orders' && (
        <section className="mt-8 space-y-6">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="Cari order (kode/nama/WA)"
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm"
              />
              <select
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm"
              >
                <option value="Semua">Semua</option>
                <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                <option value="PAID">PAID</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="INVALID_PAYMENT">INVALID_PAYMENT</option>
                <option value="REFUND">REFUND</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-soft">
            <div className="grid gap-3">
              {pagedOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setOrderModal({ ...order })}
                  className="grid w-full gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 sm:grid-cols-[1.2fr_0.8fr]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {order.order_code ?? 'Belum ada ID'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDateOnly(order.created_at)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-ink sm:text-right">
                    {formatRupiah(order.total_amount)}
                  </div>
                </button>
              ))}
            </div>
            {orderPageCount > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOrderPage((prev) => Math.max(1, prev - 1))}
                  disabled={orderPage === 1}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Prev
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: orderPageCount }, (_, index) => {
                    const page = index + 1;
                    const active = page === orderPage;
                    return (
                      <button
                        key={`order-page-${page}`}
                        type="button"
                        onClick={() => setOrderPage(page)}
                        className={`h-8 w-8 rounded-full text-xs font-semibold ${
                          active
                            ? 'bg-ink text-white'
                            : 'border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOrderPage((prev) => Math.min(orderPageCount, prev + 1))
                  }
                  disabled={orderPage === orderPageCount}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'vouchers' && (
        <section className="mt-8">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Daftar Voucher</h2>
              <button
                type="button"
                onClick={() => {
                  resetVoucherForm();
                  setShowVoucherModal(true);
                }}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Tambah Voucher
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {vouchers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada voucher.
                </div>
              )}
              {vouchers.map((voucher) => (
                <button
                  key={voucher.id}
                  type="button"
                  onClick={() => handleEditVoucher(voucher)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">{voucher.code}</div>
                    <div className="text-xs text-slate-500">
                      {voucher.type} - {voucher.value}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      voucher.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'stocks' && (
        <section className="mt-8">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Daftar Stock</h2>
              <button
                type="button"
                onClick={() => {
                  resetStockForm();
                  setShowStockModal(true);
                }}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Tambah Stock
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {stocks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada stock.
                </div>
              )}
              {stocks.map((stock) => (
                <button
                  key={stock.id}
                  type="button"
                  onClick={() => setStockDetail(stock)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {stock.name || stock.product?.name || 'Produk'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Aktif {formatDateOnly(stock.active_date)} -{' '}
                      {formatDateOnly(stock.end_date)} • {stock.duration}
                    </div>
                    {stock.product && (
                      <div className="text-xs text-slate-400">
                        Produk: {stock.product.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleStockStatus(stock);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                          isStockActive(stock) ? 'bg-emerald-200' : 'bg-slate-200'
                        }`}
                        aria-pressed={isStockActive(stock)}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                            isStockActive(stock) ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span
                        className={
                          isStockActive(stock) ? 'text-emerald-700' : 'text-slate-500'
                        }
                      >
                        {isStockActive(stock) ? 'Aktif' : 'Habis'}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {stock.warranty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <button
            type="button"
            onClick={() => setOrderModal(null)}
            className="absolute inset-0 h-full w-full"
            aria-label="Tutup"
          />
          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="grid max-h-[90vh] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="min-w-0 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Detail Order
                  </div>
                  <div className="mt-2 text-xl font-semibold text-ink">
                    {orderModal.order_code ?? 'Belum ada ID'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {orderModal.customer_name} - {orderModal.customer_whatsapp}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Tanggal order: {formatDateTime(orderModal.created_at)}
                  </div>
                  <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {orderModal.status}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>ID Internal</span>
                      <span className="font-semibold text-slate-700">{orderModal.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Terakhir update</span>
                      <span className="font-semibold text-slate-700">
                        {formatDateTime(orderModal.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Ringkasan Pesanan
                  </div>
                  <div className="mt-3 space-y-2 text-slate-600">
                    {orderModal.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span>
                          {item.product_name_snapshot} x{item.qty}
                        </span>
                        <span>{formatRupiah(item.line_total)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>Total</span>
                      <span>{formatRupiah(orderModal.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Data Lengkap
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Nama</span>
                      <span className="font-semibold text-ink">
                        {displayValue(orderModal.customer_name)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>WhatsApp</span>
                      <span className="font-semibold text-ink">
                        {displayValue(orderModal.customer_whatsapp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Voucher</span>
                      <span className="font-semibold text-ink">
                        {displayValue(orderModal.voucher_code)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Diskon Voucher</span>
                      <span className="font-semibold text-ink">
                        {orderModal.voucher_discount
                          ? formatRupiah(orderModal.voucher_discount)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Waktu bukti</span>
                      <span className="font-semibold text-ink">
                        {formatDateTime(orderModal.payment_proof_uploaded_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Link bukti</span>
                      <span className="font-semibold text-ink">
                        {orderModal.payment_proof_url ? 'Ada' : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Akun / Link Premium
                    </div>
                    <div className="mt-2 grid gap-2 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Akun</span>
                        <span className="font-semibold text-ink">
                          {displayValue(orderModal.fulfillment_account)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Email</span>
                        <span className="font-semibold text-ink">
                          {displayValue(orderModal.fulfillment_email)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Password</span>
                        <span className="font-semibold text-ink">
                          {displayValue(orderModal.fulfillment_password)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span>Link</span>
                        <span className="max-w-[220px] break-all text-right font-semibold text-ink">
                          {displayValue(orderModal.fulfillment_link)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span>Catatan</span>
                        <span className="max-w-[220px] break-words text-right font-semibold text-ink">
                          {displayValue(orderModal.fulfillment_notes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Bukti Pembayaran
                  </div>
                  {orderModal.payment_proof_url ? (
                    <img
                      src={orderModal.payment_proof_url}
                      alt="Bukti pembayaran"
                      className="mt-3 h-48 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">
                      Belum ada bukti pembayaran.
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  Lengkapi status dan kirim akun/link setelah pembayaran valid.
                </div>
                <select
                  value={orderModal.status}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, status: event.target.value } : prev
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                >
                  <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                  <option value="PAID">PAID</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="INVALID_PAYMENT">INVALID_PAYMENT</option>
                  <option value="REFUND">REFUND</option>
                </select>
                <input
                  value={orderModal.fulfillment_account ?? ''}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, fulfillment_account: event.target.value } : prev
                    )
                  }
                  placeholder="Akun / Username"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={orderModal.fulfillment_email ?? ''}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, fulfillment_email: event.target.value } : prev
                    )
                  }
                  placeholder="Email akun premium"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={orderModal.fulfillment_password ?? ''}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, fulfillment_password: event.target.value } : prev
                    )
                  }
                  placeholder="Password akun premium"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={orderModal.fulfillment_link ?? ''}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, fulfillment_link: event.target.value } : prev
                    )
                  }
                  placeholder="Link / invite"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <textarea
                  value={orderModal.fulfillment_notes ?? ''}
                  onChange={(event) =>
                    setOrderModal((prev) =>
                      prev ? { ...prev, fulfillment_notes: event.target.value } : prev
                    )
                  }
                  placeholder="Catatan admin (bisa enter)"
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateOrder(orderModal)}
                  disabled={isBusy}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                  <button
                    type="button"
                    onClick={() => setOrderModal(null)}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <button
            type="button"
            onClick={() => {
              setShowVoucherModal(false);
              resetVoucherForm();
            }}
            className="absolute inset-0 h-full w-full"
            aria-label="Tutup"
          />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="grid max-h-[90vh] gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {isEditingVoucher ? 'Edit Voucher' : 'Tambah Voucher'}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-ink">
                    {voucherForm.code || 'Form Voucher'}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Atur diskon, batasan, dan periode aktif voucher.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Ringkasan
                  </div>
                  <div className="mt-3 space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Kode</span>
                      <span className="font-semibold text-ink">
                        {voucherForm.code || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tipe</span>
                      <span className="font-semibold text-ink">{voucherForm.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Nilai</span>
                      <span className="font-semibold text-ink">{voucherValuePreview}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span className="font-semibold text-ink">
                        {voucherForm.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Periode</span>
                      <span className="font-semibold text-ink">
                        {voucherForm.starts_at || voucherForm.ends_at
                          ? `${voucherForm.starts_at || '-'} - ${
                              voucherForm.ends_at || '-'
                            }`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={voucherForm.code}
                  onChange={(event) =>
                    setVoucherForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="Kode voucher"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={voucherForm.type}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        type: event.target.value as 'PERCENT' | 'FIXED',
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="PERCENT">Diskon %</option>
                    <option value="FIXED">Diskon Rp</option>
                  </select>
                  <input
                    value={voucherForm.value}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({ ...prev, value: event.target.value }))
                    }
                    placeholder="Nilai"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={voucherForm.max_discount}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        max_discount: event.target.value,
                      }))
                    }
                    placeholder="Maks diskon"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <input
                    value={voucherForm.min_order}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        min_order: event.target.value,
                      }))
                    }
                    placeholder="Minimal order"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <input
                  value={voucherForm.usage_limit}
                  onChange={(event) =>
                    setVoucherForm((prev) => ({
                      ...prev,
                      usage_limit: event.target.value,
                    }))
                  }
                  placeholder="Batas penggunaan"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={voucherForm.starts_at}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        starts_at: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <input
                    type="date"
                    value={voucherForm.ends_at}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        ends_at: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={voucherForm.is_active}
                    onChange={(event) =>
                      setVoucherForm((prev) => ({
                        ...prev,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  Voucher aktif
                </label>
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveVoucher}
                  disabled={isBusy}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? 'Menyimpan...' : 'Simpan'}
                </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetVoucherForm();
                      setShowVoucherModal(false);
                    }}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
                  >
                    Tutup
                  </button>
                {voucherForm.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteVoucher(voucherForm.id!)}
                    disabled={isBusy}
                    className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? 'Menghapus...' : 'Hapus'}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <button
            type="button"
            onClick={() => {
              setShowStockModal(false);
              resetStockForm();
            }}
            className="absolute inset-0 h-full w-full"
            aria-label="Tutup"
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {isEditingStock ? 'Edit Stock' : 'Tambah Stock'}
                </div>
                <div className="mt-2 text-xl font-semibold text-ink">
                  {stockProductLabel}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {stockProductLabel}
                </div>
              </div>

                <div className="mt-4 grid gap-3">
                <select
                  value={stockForm.product_id}
                  onChange={(event) =>
                    setStockForm((prev) => ({
                      ...prev,
                      product_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                >
                  <option value="">Pilih produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={stockForm.active_date}
                    onChange={(event) =>
                      setStockForm((prev) => ({
                        ...prev,
                        active_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={stockForm.end_date}
                    onChange={(event) =>
                      setStockForm((prev) => ({
                        ...prev,
                        end_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  />
                </div>
                <input
                  value={stockForm.duration}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, duration: event.target.value }))
                  }
                  placeholder="Durasi (wajib)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={stockForm.warranty}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, warranty: event.target.value }))
                  }
                  placeholder="Garansi (wajib)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={stockForm.is_active}
                    onChange={(event) =>
                      setStockForm((prev) => ({
                        ...prev,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  Stock aktif
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Opsional (isi jika ada).
                </div>
                <input
                  value={stockForm.account}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, account: event.target.value }))
                  }
                  placeholder="Akun (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={stockForm.username}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="Username (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={stockForm.password}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Password (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <input
                  value={stockForm.link}
                  onChange={(event) =>
                    setStockForm((prev) => ({ ...prev, link: event.target.value }))
                  }
                  placeholder="Link / invite (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                <textarea
                  value={stockForm.description}
                  onChange={(event) =>
                    setStockForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Deskripsi (opsional)"
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveStock}
                    disabled={isBusy}
                    className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetStockForm();
                      setShowStockModal(false);
                    }}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
                  >
                    Tutup
                  </button>
                  {stockForm.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStock(stockForm.id!)}
                      disabled={isBusy}
                      className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isBusy ? 'Menghapus...' : 'Hapus'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stockDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <button
            type="button"
            onClick={() => setStockDetail(null)}
            className="absolute inset-0 h-full w-full"
            aria-label="Tutup"
          />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Detail Stock
                </div>
                <div className="mt-2 text-xl font-semibold text-ink">
                  {stockDetail.name || stockDetail.product?.name || 'Stock'}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {stockDetail.product?.name
                    ? `Produk: ${stockDetail.product.name}`
                    : 'Produk tidak ditautkan'}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Tanggal Aktif
                  </div>
                  <div className="mt-2 font-semibold text-ink">
                    {formatDateOnly(stockDetail.active_date)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Tanggal Berakhir
                  </div>
                  <div className="mt-2 font-semibold text-ink">
                    {formatDateOnly(stockDetail.end_date)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Durasi
                  </div>
                  <div className="mt-2 font-semibold text-ink">
                    {stockDetail.duration}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Garansi
                  </div>
                  <div className="mt-2 font-semibold text-ink">
                    {stockDetail.warranty}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {stockDetail.account && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Akun
                    </div>
                    <div className="mt-2 text-sm text-ink">{stockDetail.account}</div>
                  </div>
                )}
                {stockDetail.username && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Username
                    </div>
                    <div className="mt-2 text-sm text-ink">{stockDetail.username}</div>
                  </div>
                )}
                {stockDetail.password && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Password
                    </div>
                    <div className="mt-2 break-all text-sm font-semibold text-ink">
                      {stockDetail.password}
                    </div>
                  </div>
                )}
                {stockDetail.link && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Link / Invite
                    </div>
                    <div className="mt-2 break-all text-sm text-ink">{stockDetail.link}</div>
                  </div>
                )}
                {stockDetail.description && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Deskripsi
                    </div>
                    <div className="mt-2 whitespace-pre-line text-sm text-ink">
                      {stockDetail.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleEditStock(stockDetail);
                    setStockDetail(null);
                  }}
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setStockDetail(null)}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <button
            type="button"
            onClick={() => setShowProductModal(false)}
            className="absolute inset-0 h-full w-full"
            aria-label="Tutup"
          />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="grid max-h-[90vh] gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {isEditingProduct ? 'Edit Produk' : 'Tambah Produk'}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-ink">
                    {productForm.name || 'Form Produk'}
                  </div>
                </div>

                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Nama produk"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="Harga (angka)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="Kategori (contoh: AI, Video)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <textarea
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Deskripsi (boleh enter ke bawah)"
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  value={productForm.duration}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, duration: event.target.value }))
                  }
                  placeholder="Durasi"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  value={productForm.warranty}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, warranty: event.target.value }))
                  }
                  placeholder="Garansi"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Upload Gambar Produk
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Pilih beberapa gambar, lalu klik salah satu untuk jadi cover.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                      JPG / PNG
                    </span>
                  </div>

                  {showExistingImages && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-slate-500">
                        Gambar saat ini
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {existingProductImages.map((image, index) => (
                          <div
                            key={`${image}-${index}`}
                            className={`group relative h-16 w-16 overflow-hidden rounded-xl border ${
                              index === 0
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <img
                              src={image}
                              alt="Gambar produk"
                              className="h-full w-full object-cover"
                            />
                            {index === 0 ? (
                              <span className="absolute left-1 top-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Cover
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetExistingCover(index)}
                                className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 opacity-0 transition group-hover:opacity-100"
                              >
                                Jadikan cover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(index)}
                              className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProductImages.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-slate-500">
                        Preview upload
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedProductImages.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className={`group relative h-20 w-20 overflow-hidden rounded-xl border ${
                              index === 0
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                            {index === 0 ? (
                              <span className="absolute left-1 top-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Cover
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetCoverIndex(index)}
                                className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 opacity-0 transition group-hover:opacity-100"
                              >
                                Jadikan cover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedImage(index)}
                              className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-4 text-xs text-slate-500 transition hover:border-slate-400">
                      <span className="text-sm font-semibold text-slate-700">
                        Upload gambar
                      </span>
                      <span>Pilih beberapa gambar sekaligus.</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) =>
                          handleSelectProductImages(
                            event.target.files ? Array.from(event.target.files) : []
                          )
                        }
                        className="hidden"
                      />
                    </label>
                    {existingProductImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearGallery(true);
                          setRemoveCover(true);
                          setCoverFile(null);
                          setGalleryFiles([]);
                          setExistingCover(null);
                          setExistingGallery([]);
                        }}
                        className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-xs font-semibold text-red-600"
                      >
                        Hapus semua gambar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={productForm.discount_type}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        discount_type: event.target.value as 'PERCENT' | 'FIXED' | '',
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="">Tanpa diskon</option>
                    <option value="PERCENT">Diskon %</option>
                    <option value="FIXED">Diskon Rp</option>
                  </select>
                  <input
                    value={productForm.discount_value}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        discount_value: event.target.value,
                      }))
                    }
                    placeholder="Nilai diskon"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  Produk aktif
                </label>
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={isBusy}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? 'Menyimpan...' : 'Simpan'}
                </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setShowProductModal(false);
                    }}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
                  >
                    Tutup
                  </button>
                  {productForm.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(productForm.id!)}
                    disabled={isBusy}
                    className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy ? 'Menghapus...' : 'Hapus'}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-2xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            {actionLoading}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {successMessage}
        </div>
      )}
    </main>
  );
}
