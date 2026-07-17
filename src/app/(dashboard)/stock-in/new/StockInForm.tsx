"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { QrCodeListInput } from "@/components/ui/QrCodeListInput";
import { groupProductsByCategory } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  current_stock: number;
  default_warranty_months: number;
  image_urls?: string[];
  categories_mf?: { name: string } | null;
}

interface Expected {
  id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number;
  status: "open" | "closed";
}

export function StockInForm({
  products,
  defaultProductId,
  expected,
}: {
  products: Product[];
  defaultProductId?: string;
  expected?: Expected | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId ?? "");
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSerialized = (selectedProduct?.default_warranty_months ?? 0) > 0;
  const remaining = expected ? Math.max(0, expected.expected_quantity - expected.received_quantity) : null;

  function handleProductChange(id: string) {
    setSelectedProductId(id);
    setScannedCodes([]);
    setError("");
    setSavedCount(null);
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
    setSavedCount(null);
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
        notes: fd.get("notes") || null,
        created_by: user?.id ?? null,
        stock_in_expected_id: expected?.id ?? null,
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

    if (expected) {
      await supabase.rpc("increment_expected_received", { p_id: expected.id, amount: quantity });
    }

    if (isSerialized) {
      // ทำงานต่อเนื่อง: อยู่หน้าเดิม คงสินค้า/วันที่ไว้ เคลียร์แค่รายการที่สแกน
      // เพื่อสแกนล็อตถัดไปของสินค้าเดียวกันได้ทันที ถ้าจะเปลี่ยนสินค้าค่อยเลือกใหม่เอง
      setScannedCodes([]);
      setSavedCount(quantity);
      setLoading(false);
      router.refresh();
      return;
    }

    router.push("/stock-in");
    router.refresh();
  }

  async function handleCloseExpected() {
    if (!expected) return;
    if (!confirm("ปิดรายการนี้ทั้งที่ยังรับไม่ครบ?")) return;
    setClosing(true);
    const supabase = createClient();
    await supabase
      .from("stock_in_expected_mf")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", expected.id);
    router.push("/stock-in/expected");
    router.refresh();
  }

  if (expected?.status === "closed") {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-4xl">✓</p>
        <p className="text-gray-900 font-medium">รายการนี้ปิดแล้ว</p>
        <p className="text-gray-500 text-sm">รับไปแล้ว {expected.received_quantity}/{expected.expected_quantity}</p>
        <a href="/stock-in/expected" className="text-brand text-sm inline-block mt-2">← กลับไปรายการที่รอรับ</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <Select
        label="สินค้า *"
        value={selectedProductId}
        onChange={(e) => handleProductChange(e.target.value)}
        disabled={!!expected}
        required
      >
        <option value="">-- เลือกสินค้า --</option>
        {groupProductsByCategory(products).map(({ category, items }) => (
          <optgroup key={category} label={category}>
            {items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.model ? ` (${p.model})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {selectedProduct && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          {selectedProduct.image_urls?.[0] ? (
            <Image src={selectedProduct.image_urls[0]} alt={selectedProduct.name} width={80} height={56} className="h-14 w-auto max-w-20 rounded-lg object-contain shrink-0 bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xl shrink-0">📦</div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {selectedProduct.name}{selectedProduct.model ? ` (${selectedProduct.model})` : ""}
            </p>
            <p className="text-sm text-gray-500">
              สต็อกปัจจุบัน: <strong className="text-gray-900">{selectedProduct.current_stock} {selectedProduct.unit}</strong>
            </p>
          </div>
        </div>
      )}

      {expected && remaining !== null && (
        <div className="rounded-xl bg-brand/5 border border-brand/20 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">รับแล้ว {expected.received_quantity}/{expected.expected_quantity}</span>
            <span className="font-semibold text-brand">เหลืออีก {remaining}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 mt-2 overflow-hidden">
            <div
              className="h-full bg-brand"
              style={{ width: `${Math.min(100, Math.round((expected.received_quantity / expected.expected_quantity) * 100))}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleCloseExpected}
            disabled={closing}
            className="text-xs text-red-500 mt-2 disabled:opacity-50"
          >
            ปิดรายการ (รับไม่ครบ)
          </button>
        </div>
      )}

      {isSerialized ? (
        <>
          {savedCount !== null && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✓ บันทึกรับเข้าแล้ว {savedCount} ดวง — สแกนล็อตถัดไปของสินค้านี้ต่อได้เลย หรือเลือกสินค้าอื่นถ้าจะเปลี่ยน
            </div>
          )}
          <QrCodeListInput
            label="สแกน QR สินค้าที่รับเข้า"
            codes={scannedCodes}
            onChange={setScannedCodes}
            validate={validateUnusedCode}
          />
        </>
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
