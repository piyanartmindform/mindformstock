"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { ProductPicker } from "@/components/ui/ProductPicker";

interface Product {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  image_urls?: string[];
  categories_mf?: { name: string; sort_order: number } | null;
}

export function NewExpectedOutForm({
  products,
  defaultCustomer = "",
  defaultProject = "",
}: {
  products: Product[];
  defaultCustomer?: string;
  defaultProject?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([{ key: 0, productId: "", qty: "" }]);

  const patchRow = (key: number, p: Partial<{ productId: string; qty: string }>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rows.some((r) => !r.productId || !(Number(r.qty) > 0))) {
      setError("ทุกรายการต้องเลือกสินค้าและใส่จำนวนมากกว่า 0");
      return;
    }
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("stock_out_expected_mf").insert(
      rows.map((r) => ({
        product_id: r.productId,
        expected_quantity: Number(r.qty),
        customer_name: fd.get("customer_name"),
        project_name: fd.get("project_name") || null,
        note: fd.get("note") || null,
        created_by: user?.id ?? null,
      }))
    );

    if (insertError) { setError(insertError.message); setLoading(false); return; }

    router.push("/stock-out/expected");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <div className="space-y-3">
        {rows.map((r, idx) => (
          <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">รายการที่ {idx + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}
                  className="inline-flex items-center h-8 px-2.5 rounded-lg border border-red-300 bg-white text-xs font-medium text-red-600 active:bg-red-50"
                >
                  ลบรายการ
                </button>
              )}
            </div>
            <ProductPicker
              label="สินค้า"
              products={products}
              value={r.productId}
              onChange={(id) => patchRow(r.key, { productId: id })}
              required
            />
            <Input
              id={`qty-${r.key}`}
              label="จำนวนที่สั่ง *"
              type="number"
              inputMode="numeric"
              required
              min="1"
              value={r.qty}
              onChange={(e) => patchRow(r.key, { qty: e.target.value })}
              placeholder="เช่น 50"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((x) => [...x, { key: Date.now(), productId: "", qty: "" }])}
          className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
        >
          + เพิ่มสินค้าอีกรายการ
        </button>
      </div>

      <CustomerCombobox label="ชื่อลูกค้า" name="customer_name" defaultValue={defaultCustomer} required />
      <Input label="ชื่อโปรเจค" name="project_name" defaultValue={defaultProject} placeholder="ชื่อโครงการ (ถ้ามี)" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="note"
          rows={2}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="เช่น เลขที่ PO, กำหนดส่ง..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึกรายการที่รอส่ง</Button>
      </div>
    </form>
  );
}
