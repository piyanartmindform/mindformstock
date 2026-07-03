"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EditStockInForm({ item }: { item: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const newQty = Number(fd.get("quantity"));
    const oldQty = item.quantity;
    const diff = newQty - oldQty;

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("stock_in_mf")
      .update({
        quantity: newQty,
        received_date: fd.get("received_date") as string,
        supplier: (fd.get("supplier") as string) || null,
        source_country: (fd.get("source_country") as string) || null,
        notes: (fd.get("notes") as string) || null,
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Adjust stock if quantity changed
    if (diff > 0) {
      await supabase.rpc("increment_stock", { p_id: item.product_id, amount: diff });
    } else if (diff < 0) {
      await supabase.rpc("decrement_stock", { p_id: item.product_id, amount: -diff });
    }

    router.push(`/stock-in/${item.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <Input
        label="จำนวนรับเข้า *"
        name="quantity"
        type="number"
        inputMode="numeric"
        required
        min="1"
        defaultValue={item.quantity}
      />
      <Input
        label="วันที่รับเข้า *"
        name="received_date"
        type="date"
        required
        defaultValue={item.received_date}
      />
      <Input
        label="ซัพพลายเออร์"
        name="supplier"
        defaultValue={item.supplier ?? ""}
        placeholder="ชื่อซัพพลายเออร์"
      />
      <Input
        label="ประเทศต้นทาง"
        name="source_country"
        defaultValue={item.source_country ?? ""}
        placeholder="เช่น Japan, China"
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={item.notes ?? ""}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="หมายเหตุ..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>
          บันทึกการแก้ไข
        </Button>
      </div>
    </form>
  );
}
