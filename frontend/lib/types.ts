export type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  duration?: string | null;
  warranty?: string | null;
  product_images?: string[] | null;
  discount_type?: 'PERCENT' | 'FIXED' | null;
  discount_value?: number | null;
  is_active: boolean;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name_snapshot: string;
  unit_price: number;
  qty: number;
  line_total: number;
};

export type Order = {
  id: number;
  order_code: string;
  customer_name: string;
  customer_whatsapp: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  voucher_code?: string | null;
  voucher_discount?: number | null;
  fulfillment_account?: string | null;
  fulfillment_email?: string | null;
  fulfillment_password?: string | null;
  fulfillment_link?: string | null;
  fulfillment_notes?: string | null;
  payment_proof_url?: string | null;
  payment_proof_uploaded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Voucher = {
  id: number;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  max_discount?: number | null;
  min_order?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Stock = {
  id: number;
  product_id?: number | null;
  product?: Product | null;
  name: string;
  account?: string | null;
  username?: string | null;
  password?: string | null;
  link?: string | null;
  description?: string | null;
  active_date: string;
  end_date: string;
  duration: string;
  warranty: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};
