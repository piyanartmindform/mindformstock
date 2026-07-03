# CLAUDE.md — MINDFORM Stock & Warranty Management System

## Project Overview

ระบบจัดการสต็อกสินค้าของบริษัท **MINDFORM** สำหรับสินค้านำเข้าจากต่างประเทศ ที่รับมาปรับปรุง/ประกอบให้สมบูรณ์แล้วขายต่อ ครอบคลุมทั้ง spare parts, ชิ้นส่วนขนาดใหญ่ และโครงสร้างเฟอร์นิเจอร์ (เช่น โต๊ะทำงาน) พร้อมระบบรับประกันสินค้าผ่าน QR Code

**Brand color:** `#2B9ED4` (MINDFORM Blue)

---

## Tech Stack

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend | **Next.js 14** (App Router) | SSR + React, integrate กับ Supabase ได้ดี, deploy บน Vercel ง่าย |
| Backend/DB | **Supabase** (shared project กับ project เดิม) | ใช้ schema แยก `inventory_mf` ไม่กระทบ tables เดิม |
| Styling | **Tailwind CSS** | เร็ว ยืดหยุ่น |
| QR Code | **qrcode** (npm) | generate QR บน server-side |
| Deploy | **Vercel** | integrate กับ Next.js native |
| Language | **TypeScript** | type safety ลด bug |

---

## UX/UI — Mobile-First Design

> **หลักการ:** Staff ใช้งานในโกดัง/หน้างาน มือถือคือ primary device — ทุก UI ต้องใช้ได้ดีด้วยนิ้วโป้ง

### Layout & Navigation
- **Bottom Navigation Bar** สำหรับ Staff (ไม่ใช้ sidebar): Dashboard / Stock In / Stock Out / สแกน QR
- Admin ใช้ Sidebar แบบ collapsible บน tablet/desktop เท่านั้น
- ไม่มี hover state เป็น primary interaction — ใช้ tap แทนทั้งหมด

### Touch & Interaction
- ปุ่มทุกปุ่ม minimum height **48px** (touch target มาตรฐาน)
- Form input ขนาดใหญ่ ไม่แน่นเกินไป — spacing넉넉
- ใช้ **native select / date picker** บนมือถือ ไม่ custom dropdown ที่ซับซ้อน
- Action หลักของแต่ละหน้า (เช่น "บันทึกรับเข้า") เป็น **Full-width button ลอยด้านล่าง** (sticky bottom CTA)

### Forms (Stock In / Stock Out)
- แสดงทีละ step ถ้า field เยอะ (wizard-style บนมือถือ)
- ใช้ numeric keyboard อัตโนมัติสำหรับช่องจำนวน (`inputMode="numeric"`)
- Autocomplete ชื่อลูกค้า / โปรเจค จาก history ที่เคยบันทึก

### Dashboard
- Card-based layout — 1 column บนมือถือ, 2-3 column บน tablet/desktop
- Low stock alert แสดงเด่นด้านบนสุด (banner หรือ badge สีแดง)
- ตัวเลข stock ขนาดใหญ่อ่านง่ายจากระยะ

### QR & Warranty
- หน้า print QR label ออกแบบให้ **preview บนมือถือ** ก่อน print ได้
- หน้า public warranty (`/warranty/[id]`) — mobile-only design เต็มจอ แสดง status ชัดเจน (สีเขียว = ยังมีประกัน / สีแดง = หมดแล้ว)
- QR code ขนาดใหญ่พอสแกนง่าย ไม่ต่ำกว่า 200×200px บนหน้า print

### Typography & Color
- Font size body ไม่ต่ำกว่า **16px** (ป้องกัน iOS zoom อัตโนมัติ)
- Primary: `#2B9ED4` (MINDFORM Blue)
- Success: `#22C55E` / Warning: `#F59E0B` / Danger: `#EF4444`
- ใช้ contrast ratio ≥ 4.5:1 ทุกข้อความบน background

### Tailwind Breakpoint Strategy
```
default (mobile-first) → sm:640px → md:768px (tablet) → lg:1024px (desktop)
ออกแบบ default = มือถือ แล้วค่อย override ขึ้นไป
```

---

## User Roles & Permissions

| Role | สิ่งที่ทำได้ |
|---|---|
| **Admin** | ทุกอย่าง: จัดการสินค้า, ดู/แก้ไข stock, สร้าง QR, ดู report, จัดการ user |
| **Staff** | รับสินค้าเข้า, บันทึกขายออก, สร้าง QR warranty, ดู stock |
| **Customer** | สแกน QR เพื่อดูข้อมูลสินค้าและสถานะประกัน (ไม่ต้อง login) |

---

## Core Features

### 1. จัดการสินค้า (Product Catalog)
- เพิ่ม/แก้ไข/ลบประเภทสินค้า (ชื่อสินค้า, รุ่น, ยี่ห้อ, หมวดหมู่)
- หมวดหมู่: Spare Parts / ชิ้นส่วนใหญ่ / โครงสร้างเฟอร์นิเจอร์
- กำหนด **minimum stock level** ต่อสินค้า (จุดสั่งซื้อ)
- ระบุระยะเวลาประกัน default ต่อสินค้า (เช่น 1 ปี)

### 2. รับสินค้าเข้า (Stock In)
- บันทึก: สินค้า, จำนวน, วันที่รับ, แหล่งที่มา (ประเทศ/ซัพพลายเออร์), หมายเหตุ
- ยังไม่ต้องระบุ serial ตอนรับเข้า — track แค่จำนวน
- ประวัติการรับเข้าดูย้อนหลังได้

### 3. บันทึกขายออก (Stock Out)
- บันทึก: สินค้า, จำนวน, วันที่ขาย, **ชื่อลูกค้า**, **ชื่อโปรเจค**, ราคา (optional), หมายเหตุ
- ลดจำนวน stock อัตโนมัติ
- เชื่อมกับการสร้าง QR warranty ทันทีหลังบันทึก
- ดูประวัติการขายย้อนหลังได้ กรองตาม: ลูกค้า, โปรเจค, วันที่, ประเภทสินค้า

### 4. QR Code Warranty
- สร้าง QR Code **เมื่อขายออกเท่านั้น** (ชิ้นต่อชิ้น)
- แต่ละ QR มี unique ID ผูกกับการขายนั้น
- **หน้า public (ไม่ต้อง login)** เมื่อสแกน QR แสดง:
  - ชื่อสินค้า + รุ่น
  - วันที่ซื้อ
  - วันหมดประกัน
  - ชื่อลูกค้า / โปรเจค
  - สถานะประกัน (ยังมีอยู่ / หมดแล้ว)
- Print QR เป็น label สำหรับแปะสินค้าได้ (PDF หรือ print-friendly page)

### 5. แจ้งเตือน Low Stock
- แสดง warning เมื่อ stock ต่ำกว่า minimum level ที่กำหนด
- Dashboard แสดงรายการสินค้าที่ใกล้หมด
- (Phase 2) ส่ง email/notification แจ้งเตือน

### 6. Dashboard & Reports
- Stock summary: ของทั้งหมดในระบบ, จำนวนคงเหลือ, สินค้า low stock
- ประวัติ stock in/out ย้อนหลัง
- กรองตาม: ช่วงเวลา, ประเภทสินค้า, ลูกค้า, โปรเจค
- Export CSV (Phase 2)

---

## Database Schema (Supabase — schema: `public`)

> ใช้ Supabase project เดิม schema `public` เดิม แต่ต่อท้ายชื่อ table ทุกตัวด้วย `_mf` เพื่อแยกออกจาก tables ของ project อื่น

```sql
-- ประเภท/หมวดหมู่สินค้า
categories_mf (
  id, name, description, created_at
)

-- สินค้า (catalog)
products_mf (
  id, category_id, name, model, brand,
  description, unit,          -- หน่วย: ชิ้น, ชุด, อัน
  min_stock_level,            -- จุดสั่งซื้อ
  default_warranty_months,    -- ระยะประกัน default
  current_stock,              -- จำนวนคงเหลือ (computed หรือ maintained)
  created_at, updated_at
)

-- รับสินค้าเข้า
stock_in_mf (
  id, product_id, quantity,
  received_date, supplier, source_country,
  notes, created_by, created_at
)

-- ขายสินค้าออก
stock_out_mf (
  id, product_id, quantity,
  sold_date, customer_name, project_name,
  price, notes, created_by, created_at
)

-- QR / warranty record (ต่อชิ้นที่ขายออก)
warranty_items_mf (
  id,                         -- UUID → ใช้เป็น QR payload
  stock_out_id,               -- อ้างอิง transaction การขาย
  product_id,
  customer_name, project_name,
  purchase_date,
  warranty_expires_at,
  qr_code_url,                -- URL ที่ generate ไว้
  created_at
)

-- Users (ใช้ Supabase Auth ร่วมกับ project เดิม)
profiles_mf (
  id,                         -- ตรงกับ auth.users.id
  role,                       -- admin | staff
  full_name, created_at
)
```

---

## Page Structure (Next.js App Router)

```
app/
├── (auth)/
│   └── login/                  # หน้า login
├── (dashboard)/
│   ├── layout.tsx              # sidebar + auth guard
│   ├── page.tsx                # Dashboard / Overview
│   ├── products/
│   │   ├── page.tsx            # รายการสินค้าทั้งหมด
│   │   └── [id]/page.tsx       # รายละเอียดสินค้า + stock history
│   ├── stock-in/
│   │   └── page.tsx            # บันทึกรับสินค้าเข้า
│   ├── stock-out/
│   │   └── page.tsx            # บันทึกขายออก + trigger QR
│   ├── warranty/
│   │   ├── page.tsx            # รายการ warranty ทั้งหมด
│   │   └── [id]/print/page.tsx # Print QR label
│   └── reports/
│       └── page.tsx            # ประวัติ + export
└── warranty/
    └── [id]/page.tsx           # PUBLIC — ลูกค้าสแกน QR ดูข้อมูล
```

---

## QR Code Flow

```
ขายสินค้า (stock out)
    ↓
ระบุจำนวนชิ้น (เช่น 3 ชิ้น)
    ↓
ระบุ warranty เดือน (ดึงค่า default หรือแก้ได้)
    ↓
สร้าง warranty_items record × 3 ชิ้น (UUID แต่ละชิ้น)
    ↓
Generate QR Code → URL: /warranty/{uuid}
    ↓
หน้า Print: แสดง QR + ชื่อสินค้า + วันหมดประกัน → พิมพ์แปะสินค้า
```

---

## Key Business Rules

1. **Stock ลด** เมื่อบันทึก stock_out เท่านั้น (ไม่ลดตอน QR)
2. **QR สร้างได้หลายชิ้น** ต่อ 1 transaction stock_out (loop ตามจำนวน)
3. **ลูกค้าไม่ต้อง login** เพื่อดูหน้า warranty — public page
4. **Low stock alert** = current_stock ≤ min_stock_level
5. สินค้าบางชิ้น **ไม่มีประกัน** → warranty_months = 0, ไม่ต้องสร้าง QR
6. **ไม่ลบข้อมูล** — ใช้ soft delete (is_active flag) เพื่อรักษา history

---

## Development Phases

### Phase 1 (MVP)
- [ ] Auth (Supabase Auth) + role management
- [ ] Product catalog CRUD + categories
- [ ] Stock in / Stock out บันทึก
- [ ] Dashboard stock summary + low stock alert
- [ ] QR warranty generate + public page
- [ ] Print QR label

### Phase 2
- [ ] Report / Export CSV
- [ ] Email notification low stock
- [ ] ค้นหา/กรอง advanced
- [ ] รูปภาพสินค้า (Supabase Storage)

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=          # สำหรับสร้าง QR URL เช่น https://yourapp.vercel.app
```

---

## Notes for Claude

- ใช้ `@supabase/ssr` สำหรับ Next.js App Router (ไม่ใช้ `@supabase/auth-helpers-nextjs` เพราะ deprecated)
- **Table naming:** ทุก table ของ project นี้ต่อท้ายด้วย `_mf` (เช่น `products_mf`, `stock_in_mf`) — ใช้ schema `public` ปกติ ไม่ต้องสร้าง schema ใหม่
- **RLS:** ต้อง enable RLS บนทุก `*_mf` table
- QR Code URL format: `{NEXT_PUBLIC_APP_URL}/warranty/{warranty_item_uuid}`
- หน้า `/warranty/[id]` ต้องเป็น public route ไม่มี auth guard
- Print page ใช้ `@media print` CSS ซ่อน navigation แสดงแค่ QR + ข้อมูลสำคัญ + โลโก้ MINDFORM
- `current_stock` ใน `products_mf` ควร maintain ผ่าน Supabase Function/Trigger หรือคำนวณจาก `stock_in_mf - stock_out_mf` ตอน query
