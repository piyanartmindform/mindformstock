"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const field = "h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base";
const btn =
  "inline-flex items-center justify-center h-8 px-2.5 rounded-lg border text-xs font-medium disabled:opacity-50";

export interface EditableItem {
  id: string;
  quantity: number;
  isCustom: boolean;
  name: string;
  unit: string;
  customSource: string;
  note: string;
  maxQty: number | null; // null = no cap (custom lines)
}

// Edit quantity / note (and name, unit, source for custom lines) or remove one line.
export function ItemEditor({ item }: { item: EditableItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(String(item.quantity));
  const [note, setNote] = useState(item.note);
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [source, setSource] = useState(item.customSource);

  async function save() {
    const q = Number(qty);
    if (!(q > 0)) { setError("จำนวนต้องมากกว่า 0"); return; }
    if (item.maxQty !== null && q > item.maxQty) { setError(`เกินจำนวนที่เหลือ (สูงสุด ${item.maxQty})`); return; }
    if (item.isCustom && !name.trim()) { setError("ต้องมีชื่อรายการ"); return; }
    setBusy(true);
    setError("");
    const { error: err } = await createClient()
      .from("delivery_items_mf")
      .update({
        quantity: q,
        item_note: note.trim() || null,
        ...(item.isCustom
          ? { custom_name: name.trim(), custom_unit: unit.trim() || null, custom_source: source.trim() || null }
          : {}),
      })
      .eq("id", item.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("ลบรายการนี้ออกจากรอบส่ง? (รูปที่แนบไว้จะไม่ถูกใช้อีก)")) return;
    setBusy(true);
    const { error: err } = await createClient().from("delivery_items_mf").delete().eq("id", item.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex gap-2 mt-2">
        <button onClick={() => setOpen(true)} className={`${btn} border-gray-300 bg-white text-gray-700 active:bg-gray-100`}>
          ✏️ แก้ไข
        </button>
        <button onClick={remove} disabled={busy} className={`${btn} border-red-300 bg-white text-red-600 active:bg-red-50`}>
          ลบ
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      {item.isCustom && (
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อรายการ" aria-label="ชื่อรายการ" className={field} />
      )}
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max={item.maxQty ?? undefined}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          aria-label="จำนวน"
          className={`${field} text-right`}
        />
        {item.isCustom && (
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="หน่วย" aria-label="หน่วย" className={field} />
        )}
      </div>
      {item.maxQty !== null && <p className="text-xs text-gray-500">ใส่ได้สูงสุด {item.maxQty} {item.unit}</p>}
      {item.isCustom && (
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="ผู้ผลิต / แหล่งที่มา" aria-label="ผู้ผลิต" className={field} />
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตของรายการนี้" aria-label="โน้ต" className={field} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className={`${btn} border-brand bg-brand text-white`}>บันทึก</button>
        <button onClick={() => { setOpen(false); setError(""); }} disabled={busy} className={`${btn} border-gray-300 bg-white text-gray-700`}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

// Add a made-to-order / off-stock line to an existing round.
export function AddCustomItem({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("ชิ้น");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  async function add() {
    if (!name.trim() || !(Number(qty) > 0)) { setError("ต้องมีชื่อและจำนวนมากกว่า 0"); return; }
    setBusy(true);
    setError("");
    const { error: err } = await createClient().from("delivery_items_mf").insert({
      delivery_id: deliveryId,
      quantity: Number(qty),
      custom_name: name.trim(),
      custom_unit: unit.trim() || null,
      custom_source: source.trim() || null,
      item_note: note.trim() || null,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setName(""); setQty("1"); setSource(""); setNote("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
      >
        + เพิ่มรายการสั่งทำ / นอกสต็อก
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-300 bg-white p-3">
      <p className="text-xs font-medium text-yellow-800">รายการสั่งทำ / นอกสต็อก (ไม่ตัดสต็อก)</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อรายการ" aria-label="ชื่อรายการ" className={field} />
      <div className="flex gap-2">
        <input type="number" inputMode="numeric" min="1" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="จำนวน" className={`${field} text-right`} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="หน่วย" aria-label="หน่วย" className={field} />
      </div>
      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="ผู้ผลิต / แหล่งที่มา (ไม่บังคับ)" className={field} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ต (ไม่บังคับ)" className={field} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={add} disabled={busy} className={`${btn} border-brand bg-brand text-white`}>เพิ่มรายการ</button>
        <button onClick={() => { setOpen(false); setError(""); }} disabled={busy} className={`${btn} border-gray-300 bg-white text-gray-700`}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
