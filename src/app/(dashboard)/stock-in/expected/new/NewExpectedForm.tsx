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
  image_urls?: string[];
  categories_mf?: { name: string; sort_order: number } | null;
}

export function NewExpectedForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) { setError("กรุณาเลือกสินค้า"); return; }
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("stock_in_expected_mf").insert({
      product_id: selectedProductId,
      expected_quantity: Number(fd.get("expected_quantity")),
      note: fd.get("note") || null,
      created_by: user?.id ?? null,
    });

    if (insertError) { setError(insertError.message); setLoading(false); return; }

    router.push("/stock-in/expected");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <ProductPicker
        label="สินค้า"
        products={products}
        value={selectedProductId}
        onChange={setSelectedProductId}
        required
      />

      <Input
        label="จำนวนที่คาดว่าจะเข้า *"
        name="expected_quantity"
        type="number"
        inputMode="numeric"
        required
        min="1"
        placeholder="เช่น 500"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="note"
          rows={2}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="เช่น เลขที่ PO, ล็อตที่เท่าไหร่..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึกรายการที่รอรับ</Button>
      </div>
    </form>
  );
}
