"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface AvailableItem {
  expectedId: string;
  productId: string;
  name: string;
  model: string | null;
  unit: string;
  max: number;
  closed: boolean;
}

const field = "h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base";

// Add a stock product (from this customer/project's expected items) to an existing round.
export function AddStockItem({ deliveryId, available }: { deliveryId: string; available: AvailableItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expectedId, setExpectedId] = useState(available[0]?.expectedId ?? "");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  if (available.length === 0) return null;
  const chosen = available.find((a) => a.expectedId === expectedId) ?? available[0];

  async function add() {
    const q = Number(qty);
    if (!(q > 0)) { setError("จำนวนต้องมากกว่า 0"); return; }
    if (q > chosen.max) { setError(`เกินจำนวนที่เหลือ (สูงสุด ${chosen.max})`); return; }
    setBusy(true);
    setError("");
    const { error: err } = await createClient().from("delivery_items_mf").insert({
      delivery_id: deliveryId,
      expected_id: chosen.expectedId,
      product_id: chosen.productId,
      quantity: q,
      item_note: note.trim() || null,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setQty("1");
    setNote("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setQty("1"); }}
        className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
      >
        + เพิ่มสินค้าในระบบ (จากรายการที่สั่งไว้)
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium text-gray-700">เพิ่มสินค้าในระบบเข้ารอบนี้</p>
      <select
        value={chosen.expectedId}
        onChange={(e) => { setExpectedId(e.target.value); setQty("1"); }}
        aria-label="สินค้า"
        className={field}
      >
        {available.map((a) => (
          <option key={a.expectedId} value={a.expectedId}>
            {a.name}{a.model ? ` · ${a.model}` : ""} (เหลือ {a.max} {a.unit}){a.closed ? " · ปิดแล้ว" : ""}
          </option>
        ))}
      </select>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max={chosen.max}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        aria-label="จำนวน"
        className={`${field} text-right`}
      />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ต (ไม่บังคับ)" className={field} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-brand bg-brand text-xs font-medium text-white disabled:opacity-50"
        >
          เพิ่มรายการ
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          disabled={busy}
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
