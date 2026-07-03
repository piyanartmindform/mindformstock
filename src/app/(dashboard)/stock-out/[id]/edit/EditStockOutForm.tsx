"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";

export function EditStockOutForm({ item }: { item: any }) {
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
      .from("stock_out_mf")
      .update({
        quantity: newQty,
        sold_date: fd.get("sold_date") as string,
        customer_name: fd.get("customer_name") as string,
        project_name: (fd.get("project_name") as string) || null,
        price: fd.get("price") ? Number(fd.get("price")) : null,
        notes: (fd.get("notes") as string) || null,
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Adjust stock if quantity changed
    if (diff !== 0) {
      if (diff > 0) {
        // Sold more → decrement stock further
        await supabase.rpc("decrement_stock", { p_id: item.product_id, amount: diff });
      } else {
        // Sold less → return to stock
        await supabase.rpc("increment_stock", { p_id: item.product_id, amount: -diff });
      }
    }

    router.push("/stock-out");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        สต็อกปัจจุบัน: <strong className="text-gray-900">{item.products_mf?.current_stock} {item.products_mf?.unit}</strong>
        <span className="text-gray-400 ml-2">(ก่อนปรับ)</span>
      </div>

      <Input
        label="จำนวนขาย *"
        name="quantity"
        type="number"
        inputMode="numeric"
        required
        min="1"
        defaultValue={item.quantity}
      />
      <Input
        label="วันที่ขาย *"
        name="sold_date"
        type="date"
        required
        defaultValue={item.sold_date}
      />
      <CustomerCombobox
        label="ชื่อลูกค้า"
        name="customer_name"
        required
        defaultValue={item.customer_name ?? ""}
      />
      <Input
        label="ชื่อโปรเจค"
        name="project_name"
        defaultValue={item.project_name ?? ""}
        placeholder="ชื่อโครงการ (ถ้ามี)"
      />
      <Input
        label="ราคา (บาท)"
        name="price"
        type="number"
        inputMode="numeric"
        defaultValue={item.price ?? ""}
        placeholder="ไม่บังคับ"
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
