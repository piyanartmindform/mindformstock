-- ============================================================
-- MINDFORM Stock & Warranty Management System
-- Supabase Schema — ทุก table ต่อท้ายด้วย _mf
-- Run ใน Supabase SQL Editor
-- ============================================================

-- 1. หมวดหมู่สินค้า
CREATE TABLE IF NOT EXISTS categories_mf (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. สินค้า (catalog)
CREATE TABLE IF NOT EXISTS products_mf (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id              UUID REFERENCES categories_mf(id) ON DELETE SET NULL,
  name                     TEXT NOT NULL,
  model                    TEXT,
  brand                    TEXT,
  description              TEXT,
  unit                     TEXT NOT NULL DEFAULT 'ชิ้น',
  min_stock_level          INTEGER NOT NULL DEFAULT 0,
  default_warranty_months  INTEGER NOT NULL DEFAULT 0,
  current_stock            INTEGER NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 3. รับสินค้าเข้า
CREATE TABLE IF NOT EXISTS stock_in_mf (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products_mf(id) ON DELETE RESTRICT,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  received_date  DATE NOT NULL,
  supplier       TEXT,
  source_country TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ขายสินค้าออก
CREATE TABLE IF NOT EXISTS stock_out_mf (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products_mf(id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  sold_date     DATE NOT NULL,
  customer_name TEXT NOT NULL,
  project_name  TEXT,
  price         NUMERIC(12, 2),
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QR / warranty record
CREATE TABLE IF NOT EXISTS warranty_items_mf (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_out_id        UUID NOT NULL REFERENCES stock_out_mf(id) ON DELETE RESTRICT,
  product_id          UUID NOT NULL REFERENCES products_mf(id) ON DELETE RESTRICT,
  customer_name       TEXT NOT NULL,
  project_name        TEXT,
  purchase_date       DATE NOT NULL,
  warranty_expires_at TIMESTAMPTZ,
  qr_code_url         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User profiles
CREATE TABLE IF NOT EXISTS profiles_mf (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RPC Functions สำหรับ increment/decrement stock atomically
-- ============================================================

CREATE OR REPLACE FUNCTION increment_stock(p_id UUID, amount INTEGER)
RETURNS VOID AS $$
  UPDATE products_mf
  SET current_stock = current_stock + amount,
      updated_at = NOW()
  WHERE id = p_id;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, amount INTEGER)
RETURNS VOID AS $$
  UPDATE products_mf
  SET current_stock = GREATEST(0, current_stock - amount),
      updated_at = NOW()
  WHERE id = p_id;
$$ LANGUAGE SQL;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles_mf (id, role, full_name)
  VALUES (new.id, 'staff', new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE categories_mf    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_mf      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_mf      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out_mf     ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_items_mf ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_mf      ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "categories_read"        ON categories_mf;
DROP POLICY IF EXISTS "categories_write"       ON categories_mf;
DROP POLICY IF EXISTS "products_read"          ON products_mf;
DROP POLICY IF EXISTS "products_write"         ON products_mf;
DROP POLICY IF EXISTS "stock_in_all"           ON stock_in_mf;
DROP POLICY IF EXISTS "stock_out_all"          ON stock_out_mf;
DROP POLICY IF EXISTS "warranty_read_public"   ON warranty_items_mf;
DROP POLICY IF EXISTS "warranty_write"         ON warranty_items_mf;
DROP POLICY IF EXISTS "warranty_update"        ON warranty_items_mf;
DROP POLICY IF EXISTS "profiles_own"           ON profiles_mf;
DROP POLICY IF EXISTS "profiles_admin"         ON profiles_mf;

-- Categories
CREATE POLICY "categories_read"  ON categories_mf FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write" ON categories_mf FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "products_read"  ON products_mf FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON products_mf FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Stock In/Out
CREATE POLICY "stock_in_all"  ON stock_in_mf  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "stock_out_all" ON stock_out_mf FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Warranty: public read (ลูกค้าสแกน QR ไม่ต้อง login)
CREATE POLICY "warranty_read_public" ON warranty_items_mf FOR SELECT USING (true);
CREATE POLICY "warranty_write"       ON warranty_items_mf FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "warranty_update"      ON warranty_items_mf FOR UPDATE TO authenticated USING (true);

-- Profiles
CREATE POLICY "profiles_own"   ON profiles_mf FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON profiles_mf FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles_mf WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Backfill existing auth.users ที่ยังไม่มี profiles_mf
-- (รันหลัง CREATE TABLE profiles_mf เสร็จ)
-- ============================================================
INSERT INTO profiles_mf (id, role, full_name)
SELECT id, 'staff', raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles_mf)
ON CONFLICT (id) DO NOTHING;

-- หลัง backfill เสร็จ ให้ manual update role เป็น admin สำหรับ user ที่ต้องการ:
-- UPDATE profiles_mf SET role = 'admin' WHERE id = '<user-uuid-here>';

-- ============================================================
-- Sample data (optional — ลบออกได้)
-- ============================================================
INSERT INTO categories_mf (name) VALUES
  ('Spare Parts'),
  ('ชิ้นส่วนขนาดใหญ่'),
  ('โครงสร้างเฟอร์นิเจอร์')
ON CONFLICT DO NOTHING;
