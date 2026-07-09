"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { QrCodeListInput } from "@/components/ui/QrCodeListInput";

interface Product {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  current_stock: number;
  default_warranty_months: number;
}

export function StockInForm({
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

  function handleProductChange(id: string) {
    setSelectedProductId(id);
    setScannedCodes([]);
    setError("");
  }

  async function validateUnusedCode(code: string): Promise<string | undefined> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("qr_codes_mf")
      .select("status")
      .eq("code", code)
      .maybeSingle();
    if (error) return error.message;
    if (!data) return `ไม่พบรหัส ${code} ในระบบ`;
    if (data.status !== "unused") return `รหัส ${code} ถูกใช้ไปแล้ว (สถานะ: ${data.status})`;
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) { setError("กรุณาเลือกสินค้า"); return; }
    if (isSerialized && scannedCodes.length === 0) { setError("กรุณาสแกน QR สินค้าอย่างน้อย 1 ดวง"); return; }
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const quantity = isSerialized ? scannedCodes.length : Number(fd.get("quantity"));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: stockIn, error: insertError } = await supabase
      .from("stock_in_mf")
      .insert({
        product_id: selectedProductId,
        quantity,
        received_date: fd.get("received_date") as string,
        supplier: fd.get("supplier") || null,
        source_country: fd.get("source_country") || null,
        notes: fd.get("notes") || null,
        created_by: user?.email ?? user?.id ?? null,
      })
      .select()
      .single();

    if (insertError) { setError(insertError.message); setLoading(false); return; }

    if (isSerialized) {
      const { data: updated, error: qrError } = await supabase
        .from("qr_codes_mf")
        .update({ product_id: selectedProductId, status: "in_stock", stock_in_id: stockIn.id })
        .in("code", scannedCodes)
        .eq("status", "unused")
        .select("code");

      if (qrError) { setError(qrError.message); setLoading(false); return; }
      if (!updated || updated.length !== scannedCodes.length) {
        setError("มีบางรหัสถูกใช้ไปแล้วระหว่างที่กรอกฟอร์ม กรุณาตรวจสอบรายการแล้วลองใหม่");
        setLoading(false);
        return;
      }
    }

    // Update current_stock
    await supabase.rpc("increment_stock", { p_id: selectedProductId, amount: quantity });

    router.push("/stock-in");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
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
        <p className="text-sm text-gray-500">
          สต็อกปัจจุบัน: <strong className="text-gray-900">{selectedProduct.current_stock} {selectedProduct.unit}</strong>
        </p>
      )}

      {isSerialized ? (
        <QrCodeListInput
          label="สแกน QR สินค้าที่รับเข้า"
          codes={scannedCodes}
          onChange={setScannedCodes}
          validate={validateUnusedCode}
        />
      ) : (
        <Input
          label="จำนวนรับเข้า *"
          name="quantity"
          type="number"
          inputMode="numeric"
          required
          min="1"
          placeholder="0"
        />
      )}

      <Input
        label="วันที่รับเข้า *"
        name="received_date"
        type="date"
        required
        defaultValue={new Date().toISOString().split("T")[0]}
      />

      <Input label="ซัพพลายเออร์" name="supplier" placeholder="ชื่อซัพพลายเออร์" />
      <Input label="ประเทศต้นทาง" name="source_country" placeholder="เช่น Japan, China" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="หมายเหตุเพิ่มเติม..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึกรับเข้า</Button>
      </div>
    </form>
  );
}
