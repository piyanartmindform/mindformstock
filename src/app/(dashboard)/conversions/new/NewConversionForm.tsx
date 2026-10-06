"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/ui/ProductPicker";

interface Product {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  current_stock: number;
  image_urls?: string[];
  categories_mf?: { name: string; sort_order: number } | null;
}

interface Row {
  key: number;
  productId: string;
  qty: string;
}

const newRow = (): Row => ({ key: Date.now() + Math.random(), productId: "", qty: "" });

export function NewConversionForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outRows, setOutRows] = useState<Row[]>([newRow()]);
  const [inRows, setInRows] = useState<Row[]>([newRow()]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const all = [...outRows, ...inRows];
    if (all.some((r) => !r.productId || !(Number(r.qty) > 0))) {
      setError("ทุกรายการต้องเลือกสินค้าและใส่จำนวนมากกว่า 0");
      return;
    }
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { data, error: rpcError } = await createClient().rpc("create_conversion", {
      p_date: fd.get("converted_date") || null,
      p_note: (fd.get("note") as string) || null,
      p_items: [
        ...outRows.map((r) => ({ product_id: r.productId, direction: "out", quantity: Number(r.qty) })),
        ...inRows.map((r) => ({ product_id: r.productId, direction: "in", quantity: Number(r.qty) })),
      ],
    });
    if (rpcError || !data) { setError(rpcError?.message ?? "บันทึกไม่สำเร็จ"); setLoading(false); return; }
    router.push("/conversions");
    router.refresh();
  }

  function section(
    title: string,
    hint: string,
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    tone: string,
    showStock: boolean
  ) {
    const patch = (key: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
    return (
      <div className={`rounded-2xl border p-3 space-y-3 ${tone}`}>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-600">{hint}</p>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
            <ProductPicker
              label="สินค้า"
              products={products}
              value={r.productId}
              onChange={(id) => patch(r.key, { productId: id })}
              renderExtra={showStock ? (p) => <span>คงเหลือ {p.current_stock} {p.unit}</span> : undefined}
              required
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id={`qty-${r.key}`}
                  label="จำนวน"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={r.qty}
                  onChange={(e) => patch(r.key, { qty: e.target.value })}
                  placeholder="เช่น 1"
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}
                  className="h-12 px-3 rounded-xl border border-red-300 bg-white text-sm font-medium text-red-600 active:bg-red-50"
                >
                  ลบ
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((x) => [...x, newRow()])}
          className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
        >
          + เพิ่มรายการ
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      {section("สิ่งที่ใช้ (ตัดออกจากสต็อก)", "สินค้าที่ถูกนำมาแปลง", outRows, setOutRows, "border-red-200 bg-red-50", true)}
      {section("สิ่งที่ได้ (เพิ่มเข้าสต็อก)", "สินค้าที่ได้ใหม่ และชิ้นส่วนที่เหลือ", inRows, setInRows, "border-green-200 bg-green-50", false)}

      <Input label="วันที่" name="converted_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">โน้ต</label>
        <textarea
          name="note"
          rows={2}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="เช่น แปลง TJ-F20A-8A เป็น 2 ที่นั่ง"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึกใบแปลงสภาพ</Button>
      </div>
    </form>
  );
}
