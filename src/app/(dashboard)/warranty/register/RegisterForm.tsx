"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { QrScanner } from "@/components/ui/QrScanner";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";

interface Product {
  id: string;
  name: string;
  model: string | null;
  default_warranty_months: number;
}

export function RegisterForm({ products }: { products: Product[] }) {
  const [showScanner, setShowScanner] = useState(false);
  const [code, setCode] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [warrantyYears, setWarrantyYears] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [savedCode, setSavedCode] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Auto-fill warranty years when product changes
  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setWarrantyYears(p.default_warranty_months / 12);
  }

  // Calculate expiry date for display
  function calcExpiry(): string {
    if (!warrantyYears || warrantyYears <= 0) return "ไม่มีประกัน";
    const d = new Date(purchaseDate);
    d.setMonth(d.getMonth() + Math.round(warrantyYears * 12));
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const trimmedCode = code.trim().toUpperCase();

    const fd = new FormData(e.currentTarget);
    const warrantyMonths = Math.round(warrantyYears * 12);
    let warrantyExpiresAt: string | null = null;
    if (warrantyMonths > 0) {
      const d = new Date(purchaseDate);
      d.setMonth(d.getMonth() + warrantyMonths);
      warrantyExpiresAt = d.toISOString();
    }

    const payload = {
      status: "registered",
      product_id: selectedProductId || null,
      customer_name: fd.get("customer_name") as string,
      project_name: (fd.get("project_name") as string) || null,
      purchase_date: purchaseDate,
      warranty_months: warrantyMonths,
      warranty_expires_at: warrantyExpiresAt,
      notes: (fd.get("notes") as string) || null,
      registered_at: new Date().toISOString(),
    };

    // Check if code already exists
    const { data: existing } = await supabase
      .from("qr_codes_mf")
      .select("id, status")
      .eq("code", trimmedCode)
      .single();

    if (existing?.status === "registered") {
      setError(`รหัส ${trimmedCode} ถูกลงทะเบียนไปแล้ว`);
      setLoading(false);
      return;
    }

    let updateErr: any;
    if (existing) {
      // Code exists (unused) — update it
      const res = await supabase
        .from("qr_codes_mf")
        .update(payload)
        .eq("id", existing.id);
      updateErr = res.error;
    } else {
      // Code not in system — insert new record for external QR codes
      const numMatch = trimmedCode.match(/(\d+)$/);
      const qrNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
      const prefixMatch = trimmedCode.match(/^([A-Z]+)/i);
      const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "EXT";
      // Use a fixed batch_id to represent manually-registered external codes
      const EXTERNAL_BATCH_ID = "00000000-0000-0000-0000-000000000000";
      const res = await supabase
        .from("qr_codes_mf")
        .insert({ code: trimmedCode, qr_number: qrNumber, prefix, batch_id: EXTERNAL_BATCH_ID, ...payload });
      updateErr = res.error;
    }

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setSavedCode(trimmedCode);
    setSuccess(true);
  }

  function handleScan(scannedCode: string) {
    setShowScanner(false);
    setCode(scannedCode);
  }

  function resetForm() {
    setSuccess(false);
    setLoading(false);
    setCode("");
    setSelectedProductId("");
    setWarrantyYears(0);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setError("");
    setSavedCode("");
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">ลงทะเบียนสำเร็จ</h2>
        <p className="text-gray-500 mb-6">{savedCode} ถูกผูกกับข้อมูลลูกค้าแล้ว</p>
        <button
          onClick={resetForm}
          className="h-12 px-6 bg-brand text-white rounded-xl font-medium text-sm"
        >
          ลงทะเบียนรายการถัดไป
        </button>
      </div>
    );
  }

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pb-28">
        {/* QR Code */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">รหัส QR สติ๊กเกอร์ *</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="เช่น MF-00001"
              required
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="h-[50px] px-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-1.5 active:bg-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
              สแกน
            </button>
          </div>
        </div>

        {/* Product */}
        <Select label="สินค้า" value={selectedProductId} onChange={handleProductChange}>
          <option value="">-- เลือกสินค้า --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.model ? ` (${p.model})` : ""}
            </option>
          ))}
        </Select>

        {/* Customer */}
        <CustomerCombobox label="ชื่อลูกค้า" name="customer_name" required />
        <Input label="ชื่อโปรเจค" name="project_name" placeholder="ชื่อโครงการ (ถ้ามี)" />

        {/* Dates */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">วันที่เริ่มรับประกัน *</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">ระยะประกัน (ปี)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={warrantyYears}
            onChange={(e) => setWarrantyYears(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0 = ไม่มีประกัน"
          />
        </div>

        {/* Expiry preview */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">หมดประกัน</span>
          <span className={`text-sm font-semibold ${warrantyYears > 0 ? "text-gray-900" : "text-gray-400"}`}>
            {calcExpiry()}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="หมายเหตุ (ถ้ามี)"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
          <Button type="submit" fullWidth loading={loading}>
            ลงทะเบียนประกัน
          </Button>
        </div>
      </form>
    </>
  );
}
