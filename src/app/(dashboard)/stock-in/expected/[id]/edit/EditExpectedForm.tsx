"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Expected {
  id: string;
  expected_quantity: number;
  received_quantity: number;
  note: string | null;
  products_mf?: { name: string; model: string | null; unit: string };
}

export function EditExpectedForm({ expected }: { expected: Expected }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const expectedQuantity = Number(fd.get("expected_quantity"));

    if (expectedQuantity < expected.received_quantity) {
      setError(`จำนวนที่คาดว่าจะเข้าต้องไม่น้อยกว่าที่รับไปแล้ว (${expected.received_quantity})`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("stock_in_expected_mf")
      .update({
        expected_quantity: expectedQuantity,
        note: fd.get("note") || null,
      })
      .eq("id", expected.id);

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    router.push("/stock-in/expected");
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
        รับไปแล้ว {expected.received_quantity} {expected.products_mf?.unit}
      </Card>

      <Input
        label="จำนวนที่คาดว่าจะเข้า *"
        name="expected_quantity"
        type="number"
        inputMode="numeric"
        required
        min={expected.received_quantity}
        defaultValue={expected.expected_quantity}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea
          name="note"
          rows={2}
          defaultValue={expected.note ?? ""}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="เช่น เลขที่ PO, ล็อตที่เท่าไหร่..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>บันทึก</Button>
      </div>
    </form>
  );
}
