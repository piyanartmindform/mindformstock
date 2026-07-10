"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";

interface Expected {
  id: string;
  expected_quantity: number;
  sold_quantity: number;
  customer_name: string;
  project_name: string | null;
  note: string | null;
  products_mf?: { name: string; model: string | null; unit: string };
}

export function EditExpectedOutForm({ expected }: { expected: Expected }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const expectedQuantity = Number(fd.get("expected_quantity"));

    if (expectedQuantity < expected.sold_quantity) {
      setError(`จำนวนที่สั่งต้องไม่น้อยกว่าที่ส่งไปแล้ว (${expected.sold_quantity})`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("stock_out_expected_mf")
      .update({
        expected_quantity: expectedQuantity,
        customer_name: fd.get("customer_name"),
        project_name: fd.get("project_name") || null,
        note: fd.get("note") || null,
      })
      .eq("id", expected.id);

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    router.push("/stock-out/expected");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <p className="font-medium text-gray-900 text-sm truncate">
          {expected.products_mf?.name}{expected.products_mf?.model ? ` (${expected.products_mf.model})` : ""}
        </p>
      </div>

      <Card className="py-3 text-sm text-gray-600">
        ส่งไปแล้ว {expected.sold_quantity} {expected.products_mf?.unit}
      </Card>

      <Input
        label="จำนวนที่สั่ง *"
        name="expected_quantity"
        type="number"
        inputMode="numeric"
        required
        min={expected.sold_quantity}
        defaultValue={expected.expected_quantity}
      />

      <CustomerCombobox label="ชื่อลูกค้า" name="customer_name" defaultValue={expected.customer_name} required />
      <Input label="ชื่อโปรเจค" name="project_name" defaultValue={expected.project_name ?? ""} placeholder="ชื่อโครงการ (ถ้ามี)" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="note"
          rows={2}
          defaultValue={expected.note ?? ""}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="เช่น เลขที่ PO, กำหนดส่ง..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึก</Button>
      </div>
    </form>
  );
}
