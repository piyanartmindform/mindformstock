"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  image_urls?: string[];
}

interface Expected {
  id: string;
  product_id: string;
  expected_quantity: number;
  sold_quantity: number;
  customer_name: string;
  project_name: string | null;
  status: "open" | "closed";
}

export function StockOutForm({
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
  const [quantityInput, setQuantityInput] = useState("");
  const [forceQuantityMode, setForceQuantityMode] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSerialized = !forceQuantityMode && (selectedProduct?.default_warranty_months ?? 0) > 0;
  const remaining = expected ? Math.max(0, expected.expected_quantity - expected.sold_quantity) : null;

  function handleProductChange(id: string) {
    setSelectedProductId(id);
    setScannedCodes([]);
    setForceQuantityMode(false);
    setError("");
    setSavedCount(null);
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

    const fd = new FormData(e.currentTarget);
    const quantity = isSerialized ? scannedCodes.length : Number(quantityInput);

    setError("");
    setSavedCount(null);
    setLoading(true);

    const soldDate = fd.get("sold_date") as string;
    const customerName = expected ? expected.customer_name : (fd.get("customer_name") as string);
    const projectName = expected ? expected.project_name : ((fd.get("project_name") as string) || null);

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
        created_by: user?.id ?? null,
        stock_out_expected_id: expected?.id ?? null,
      })
      .select()
      .single();

    if (outError) { setError(outError.message); setLoading(false); return; }

    if (isSerialized) {
      // กล่องที่สแกนออกตอนนี้ตัดสต็อกเท่านั้น ไม่ผูกประกัน — ประกันจะลงทะเบียนแยกด้วย QR ใหม่
      // ตอนติดตั้งหน้างานผ่าน /warranty/register แทน
      const { data: updated, error: qrError } = await supabase
        .from("qr_codes_mf")
        .update({ status: "sold", stock_out_id: stockOut.id })
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

    if (expected) {
      await supabase.rpc("increment_expected_sold", { p_id: expected.id, amount: quantity });
    }

    if (isSerialized) {
      // ทำงานต่อเนื่อง: อยู่หน้าเดิม คงสินค้า/ลูกค้าไว้ เคลียร์แค่รายการที่สแกน
      // เพื่อสแกนชิ้นถัดไปของสินค้าเดียวกันได้ทันที ถ้าจะเปลี่ยนสินค้าค่อยเลือกใหม่เอง
      setScannedCodes([]);
      setSavedCount(quantity);
      setLoading(false);
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleCloseExpected() {
    if (!expected) return;
    if (!confirm("ปิดรายการนี้ทั้งที่ยังส่งไม่ครบ?")) return;
    setClosing(true);
    const supabase = createClient();
    await supabase
      .from("stock_out_expected_mf")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", expected.id);
    router.push("/stock-out/expected");
    router.refresh();
  }

  if (expected?.status === "closed") {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-4xl">✓</p>
        <p className="text-gray-900 font-medium">รายการนี้ปิดแล้ว</p>
        <p className="text-gray-500 text-sm">ส่งไปแล้ว {expected.sold_quantity}/{expected.expected_quantity}</p>
        <a href="/stock-out/expected" className="text-brand text-sm inline-block mt-2">← กลับไปรายการที่รอส่ง</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      <Select
        label="สินค้า *"
        value={selectedProductId}
        onChange={(e) => handleProductChange(e.target.value)}
        disabled={!!expected}
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
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          {selectedProduct.image_urls?.[0] ? (
            <Image src={selectedProduct.image_urls[0]} alt={selectedProduct.name} width={80} height={56} className="h-14 w-auto max-w-20 rounded-lg object-contain shrink-0 bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xl">📦</div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {selectedProduct.name}{selectedProduct.model ? ` (${selectedProduct.model})` : ""}
            </p>
            <p className="text-sm text-gray-500">
              สต็อกคงเหลือ: <strong className={selectedProduct.current_stock === 0 ? "text-red-500" : "text-gray-900"}>{selectedProduct.current_stock} {selectedProduct.unit}</strong>
            </p>
          </div>
        </div>
      )}

      {expected && remaining !== null && (
        <div className="rounded-xl bg-brand/5 border border-brand/20 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">ส่งแล้ว {expected.sold_quantity}/{expected.expected_quantity}</span>
            <span className="font-semibold text-brand">เหลืออีก {remaining}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 mt-2 overflow-hidden">
            <div
              className="h-full bg-brand"
              style={{ width: `${Math.min(100, Math.round((expected.sold_quantity / expected.expected_quantity) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ลูกค้า: {expected.customer_name}{expected.project_name ? ` · ${expected.project_name}` : ""}
          </p>
          <button
            type="button"
            onClick={handleCloseExpected}
            disabled={closing}
            className="text-xs text-red-500 mt-2 disabled:opacity-50"
          >
            ปิดรายการ (ส่งไม่ครบ)
          </button>
        </div>
      )}

      {savedCount !== null && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✓ บันทึกขายออกแล้ว {savedCount} {selectedProduct?.unit} — สแกนชิ้นถัดไปของสินค้านี้ต่อได้เลย หรือเลือกสินค้าอื่นถ้าจะเปลี่ยน
        </div>
      )}

      {isSerialized ? (
        <>
          <QrCodeListInput
            label="สแกนบาร์โค้ดกล่องที่จะขายออก"
            codes={scannedCodes}
            onChange={setScannedCodes}
            validate={validateInStockCode}
          />
          <button
            type="button"
            onClick={() => { setForceQuantityMode(true); setScannedCodes([]); setError(""); }}
            className="text-xs text-brand underline"
          >
            สินค้านี้ไม่มีบาร์โค้ดติดสต็อกไว้? กดที่นี่เพื่อขายแบบนับจำนวนแทน
          </button>
        </>
      ) : (
        <>
          {forceQuantityMode && (selectedProduct?.default_warranty_months ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setForceQuantityMode(false)}
              className="text-xs text-brand underline"
            >
              ← กลับไปสแกนบาร์โค้ดที่อยู่ในสต็อกแทน
            </button>
          )}
          <Input
            label="จำนวนขาย *"
            name="quantity"
            type="number"
            inputMode="numeric"
            required
            min="1"
            max={selectedProduct?.current_stock}
            placeholder="0"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
          />
        </>
      )}

      <Input
        label="วันที่ขาย *"
        name="sold_date"
        type="date"
        required
        defaultValue={new Date().toISOString().split("T")[0]}
      />

      {!expected && (
        <>
          <CustomerCombobox label="ชื่อลูกค้า" name="customer_name" required />
          <Input label="ชื่อโปรเจค" name="project_name" placeholder="ชื่อโครงการ (ถ้ามี)" />
        </>
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
