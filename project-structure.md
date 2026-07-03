# Project Structure — MINDFORM Stock & Warranty Management System

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/ssr`)

---

## โครงสร้างโฟลเดอร์

```
mindform-stock/
├── public/
│   └── logo.png                        # MINDFORM logo สำหรับใช้ใน UI และ print
│
├── src/
│   ├── app/
│   │   │
│   │   ├── (auth)/                     # กลุ่มหน้าที่ไม่ต้อง login
│   │   │   └── login/
│   │   │       └── page.tsx            # หน้า login
│   │   │
│   │   ├── (dashboard)/                # กลุ่มหน้าที่ต้อง login (มี auth guard)
│   │   │   ├── layout.tsx              # Layout หลัก: Bottom Nav (mobile) + Sidebar (desktop)
│   │   │   │
│   │   │   ├── page.tsx                # Dashboard — stock summary, low stock alert
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── page.tsx            # รายการสินค้าทั้งหมด + ค้นหา + กรอง
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx        # เพิ่มสินค้าใหม่
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # รายละเอียดสินค้า + stock history
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx    # แก้ไขสินค้า (admin only)
│   │   │   │
│   │   │   ├── stock-in/
│   │   │   │   ├── page.tsx            # ประวัติรับสินค้าเข้า
│   │   │   │   └── new/
│   │   │   │       └── page.tsx        # บันทึกรับสินค้าเข้า
│   │   │   │
│   │   │   ├── stock-out/
│   │   │   │   ├── page.tsx            # ประวัติขายออก
│   │   │   │   └── new/
│   │   │   │       └── page.tsx        # บันทึกขายออก + trigger สร้าง QR
│   │   │   │
│   │   │   ├── warranty/
│   │   │   │   ├── page.tsx            # รายการ warranty ทั้งหมด
│   │   │   │   └── [id]/
│   │   │   │       └── print/
│   │   │   │           └── page.tsx    # Print QR label (print-friendly)
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx            # ตั้งค่าทั่วไป (admin only)
│   │   │       └── users/
│   │   │           └── page.tsx        # จัดการ user (admin only)
│   │   │
│   │   ├── warranty/                   # PUBLIC — ไม่มี auth guard
│   │   │   └── [id]/
│   │   │       └── page.tsx            # ลูกค้าสแกน QR ดูข้อมูลประกัน
│   │   │
│   │   ├── api/
│   │   │   └── warranty/
│   │   │       └── [id]/
│   │   │           └── qr/
│   │   │               └── route.ts    # API generate QR Code image
│   │   │
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Tailwind base styles
│   │
│   ├── components/
│   │   ├── ui/                         # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx               # สถานะ stock / warranty
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx           # Bottom navigation (mobile)
│   │   │   ├── Sidebar.tsx             # Sidebar (desktop/tablet)
│   │   │   └── TopBar.tsx              # Header bar
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StockSummaryCard.tsx    # Card แสดงจำนวน stock
│   │   │   └── LowStockAlert.tsx       # Banner/list สินค้าใกล้หมด
│   │   │
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductForm.tsx
│   │   │
│   │   ├── stock/
│   │   │   ├── StockInForm.tsx
│   │   │   └── StockOutForm.tsx
│   │   │
│   │   └── warranty/
│   │       ├── QRCodeDisplay.tsx       # แสดง QR image
│   │       └── WarrantyStatus.tsx      # สถานะประกัน (active/expired)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Supabase client (browser)
│   │   │   ├── server.ts               # Supabase client (server/RSC)
│   │   │   └── middleware.ts           # Auth session refresh
│   │   │
│   │   ├── queries/                    # Supabase query functions
│   │   │   ├── products.ts
│   │   │   ├── stock.ts
│   │   │   └── warranty.ts
│   │   │
│   │   └── utils.ts                    # Helper functions ทั่วไป
│   │
│   ├── types/
│   │   └── database.ts                 # TypeScript types ตรงกับ DB schema
│   │
│   └── middleware.ts                   # Next.js middleware — auth guard ทุก route ใน (dashboard)
│
├── .env.local                          # Environment variables (ห้าม commit)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Convention ที่ยึดตาม

### Naming
- **โฟลเดอร์/ไฟล์ route:** `kebab-case` (เช่น `stock-in/`, `stock-out/`)
- **Components:** `PascalCase` (เช่น `StockInForm.tsx`)
- **Functions/variables:** `camelCase`
- **DB table:** `snake_case` + suffix `_mf` (เช่น `products_mf`)

### Data Fetching
- **Server Components (RSC):** ใช้ `lib/supabase/server.ts` — fetch ข้อมูลตรงใน component
- **Client Components:** ใช้ `lib/supabase/client.ts` — เฉพาะ interactive UI เท่านั้น
- **Query functions:** รวมไว้ใน `lib/queries/` ไม่เขียน query กระจายใน component

### Auth Guard
- `middleware.ts` ดัก redirect ทุก route ที่ขึ้นต้นด้วย `/(dashboard)/`
- Route `/warranty/[id]` เป็น public — ไม่มี guard

### Mobile-First
- เขียน Tailwind default = mobile → override ด้วย `md:` และ `lg:`
- ทุก interactive element สูงไม่ต่ำกว่า `h-12` (48px)
- Action button หลักใช้ `fixed bottom-4 left-4 right-4` บนมือถือ

---

## การติดตั้งเริ่มต้น

```bash
# สร้าง project
npx create-next-app@latest mindform-stock --typescript --tailwind --app --src-dir

# เข้าโฟลเดอร์
cd mindform-stock

# ติดตั้ง dependencies
npm install @supabase/ssr @supabase/supabase-js
npm install qrcode
npm install @types/qrcode --save-dev
```
