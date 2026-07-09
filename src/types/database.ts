export type UserRole = "admin" | "staff";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  model: string | null;
  brand: string | null;
  description: string | null;
  unit: string;
  min_stock_level: number;
  default_warranty_months: number;
  current_stock: number;
  image_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories_mf?: Category;
}

export interface StockIn {
  id: string;
  product_id: string;
  quantity: number;
  received_date: string;
  supplier: string | null;
  source_country: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  products_mf?: Product;
}

export interface StockOut {
  id: string;
  product_id: string;
  quantity: number;
  sold_date: string;
  customer_name: string;
  project_name: string | null;
  price: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  products_mf?: Product;
}

export interface WarrantyItem {
  id: string;
  stock_out_id: string;
  product_id: string;
  customer_name: string;
  project_name: string | null;
  purchase_date: string;
  warranty_expires_at: string | null;
  qr_code_url: string | null;
  created_at: string;
  products_mf?: Product;
  stock_out_mf?: StockOut;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface LowStockProduct extends Product {
  category_name: string | null;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  todayStockIn: number;
  todayStockOut: number;
}
