"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { QrCodeListInput } from "@/components/ui/QrCodeListInput";

interface Product {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  current_stock: number;
  default_warranty_months: number;
}

export function StockOutForm({
  products,
  defaultProductId,
}: {
  products: Product[];
  defaultProductId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId ?? "");
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSerialized = (selectedProduct?.default_warranty_months ?? 0) > 0;
  const [warrantyYears, setWarrantyYears] = useState(0);

  function handleProductChange(id: string) {
    setSelectedProductId(id);
    setScannedCodes([]);
    setError("");
    const p = products.find((x) => x.id === id);
    setWarrantyYears(p ? p.default_warranty_months / 12 : 0);
  }

  async function validateInStockCode(code: string): Promise<string | undefined> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("qr_codes_mf")
      .select("status, product_id")
      .eq("code", code)
      .maybeSingle();
    if (error) return error.message;
    if (!data) return `ไม่พบรหัส ${code} ในระบบ`;
    if (data.status !== "in_stock") return `รหัส ${code} ไม่ได้อยู่ในสต็อก (สถานะ: ${data.status})`;
    if (data.product_id !== selectedProductId) return `รหัส ${code} เป็นของสินค้าอื่น`;
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) { setError("กรุณาเลือกสินค้า"); return; }
    if (isSerialized && scannedCodes.length === 0) { setError("กรุณาสแกน QR สินค้าที่จะเอาออกอย่างน้อย 1 ดวง"); return; }
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const quantity = isSerialized ? scannedCodes.length : Number(fd.get("quantity"));
    const soldDate = fd.get("sold_date") as string;
    const customerName = fd.get("customer_name") as string;
    const projectName = fd.get("project_name") as string || null;

    if (quantity > (selectedProduct?.current_stock ?? 0)) {
      setError(`สต็อกไม่พอ (มี ${selectedProduct?.current_stock} ${selectedProduct?.unit})`);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert stock_out
    const { data: stockOut, error: outError } = await supabase
      .from("stock_out_mf")
      .insert({
        product_id: selectedProductId,
        quantity,
        sold_date: soldDate,
        customer_name: customerName,
        project_name: projectName,
        price: fd.get("price") ? Number(fd.get("price")) : null,
        notes: fd.get("notes") || null,
        created_by: user?.email ?? user?.id ?? null,
      })
      .select()
      .single();

    if (outError) { setError(outError.message); setLoading(false); return; }

    if (isSerialized) {
      const warrantyMonths = Math.round(warrantyYears * 12);
      let warrantyExpiresAt: string | null = null;
      if (warrantyMonths > 0) {
        const d = new Date(soldDate);
        d.setMonth(d.getMonth() + warrantyMonths);
        warrantyExpiresAt = d.toISOString();
      }

      const { data: updated, error: qrError } = await supabase
        .from("qr_codes_mf")
        .update({
          status: "registered",
          customer_name: customerName,
          project_name: projectName,
          purchase_date: soldDate,
          warranty_months: warrantyMonths,
          warranty_expires_at: warrantyExpiresAt,
          stock_out_id: stockOut.id,
          registered_at: new Date().toISOString(),
        })
        .in("code", scannedCodes)
        .eq("status", "in_stock")
        .eq("product_id", selectedProductId)
        .select("code");

      if (qrError) { setError(qrError.message); setLoading(false); return; }
      if (!updated || updated.length !== scannedCodes.length) {
        setError("มีบางรหัสถูกใช้ไปแล้วระหว่างที่กรอกฟอร์ม กรุณาตรวจสอบรายการแล้วลองใหม่");
        setLoading(false);
        return;
      }
    }

    // 2. Decrement stock
    await supabase.rpc("decrement_stock", { p_id: selectedProductId, amount: quantity });

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      <Select
        label="สินค้า *"
        value={selectedProductId}
        onChange={(e) => handleProductChange(e.target.value)}
        required
      >
        <option value="">-- เลือกสินค้า --</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.model ? ` (${p.model})` : ""}
          </option>
        ))}
      </Select>

      {selectedProduct && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <p className="text-gray-500">สต็อกคงเหลือ: <strong className={`${selectedProduct.current_stock === 0 ? "text-red-500" : "text-gray-900"}`}>{selectedProduct.current_stock} {selectedProduct.unit}</strong></p>
        </div>
      )}

      {isSerialized ? (
        <QrCodeListInput
          label="สแกน QR สินค้าที่จะขายออก"
          codes={scannedCodes}
          onChange={setScannedCodes}
          validate={validateInStockCode}
        />
      ) : (
        <Input
          label="จำนวนขาย *"
          name="quantity"
          type="number"
          inputMode="numeric"
          required
          min="1"
          max={selectedProduct?.current_stock}
          placeholder="0"
        />
      )}

      <Input
        label="วันที่ขาย *"
        name="sold_date"
        type="date"
        required
        defaultValue={new Date().toISOString().split("T")[0]}
      />

      <CustomerCombobox label="ชื่อลูกค้า" name="customer_name" required />
      <Input label="ชื่อโปรเจค" name="project_name" placeholder="ชื่อโครงการ (ถ้ามี)" />

      {isSerialized && (
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
      )}

      <Input label="ราคา (บาท)" name="price" type="number" inputMode="numeric" placeholder="ไม่บังคับ" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="หมายเหตุ..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading} size="lg">
          บันทึกขายออก
        </Button>
      </div>
    </form>
  );
}
