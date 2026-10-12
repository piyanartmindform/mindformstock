"use client";

import { confirmDialog } from "@/components/ui/confirmDialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

export interface CustomerItem {
  id: string;
  label: string;
  labelEn: string | null;
  quantity: number;
  unit: string;
  imagePath: string | null;
  imageUrl: string | null;
  /** names of the prep-sheet lines assigned to this customer line */
  assigned: string[];
}

export interface PrepLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  /** how much of this line already goes into each customer line */
  allocations: { customerItemId: string; quantity: number }[];
}

const field = "h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base";
const area = "w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base";
const btn =
  "inline-flex items-center justify-center h-8 px-2.5 rounded-lg border text-xs font-medium disabled:opacity-50";

// Lines the customer sees on the delivery note (name, number of sets, correct photo).
export function CustomerItemsEditor({
  deliveryId,
  items,
  lines,
  linksReady,
  canEdit,
}: {
  deliveryId: string;
  items: CustomerItem[];
  lines: PrepLine[];
  linksReady: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null); // "new" or an item id
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("ชุด");
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  // prep line id -> quantity (as text) put into the customer line being edited
  const [picked, setPicked] = useState<Record<string, string>>({});

  function startEdit(item: CustomerItem | null) {
    setEditingId(item ? item.id : "new");
    setLabel(item?.label ?? "");
    setLabelEn(item?.labelEn ?? "");
    setQty(String(item?.quantity ?? 1));
    setUnit(item?.unit ?? "ชุด");
    setFile(null);
    setRemoveImage(false);
    setPicked(
      item
        ? Object.fromEntries(
            lines.flatMap((l) => {
              const mine = l.allocations.find((a) => a.customerItemId === item.id);
              return mine ? [[l.id, String(mine.quantity)]] : [];
            })
          )
        : {}
    );
    setError("");
  }

  async function uploadImage(supabase: ReturnType<typeof createClient>, id: string, f: File) {
    const path = `${deliveryId}/customer/${id}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("delivery-docs")
      .upload(path, await resizeImage(f), { contentType: "image/jpeg" });
    if (upErr) throw upErr;
    return path;
  }

  async function save() {
    const q = Number(qty);
    if (!label.trim() || !(q > 0)) { setError("ต้องมีชื่อรายการและจำนวนมากกว่า 0"); return; }
    const chosen = Object.entries(picked).map(([id, text]) => ({ id, quantity: Number(text) }));
    for (const c of chosen) {
      const line = lines.find((l) => l.id === c.id)!;
      const elsewhere = line.allocations
        .filter((a) => a.customerItemId !== editingId)
        .reduce((n, a) => n + a.quantity, 0);
      const max = line.quantity - elsewhere;
      if (!(c.quantity > 0) || c.quantity > max) {
        setError(`${line.name}: จำนวนต้องอยู่ระหว่าง 1 ถึง ${max} (ที่เหลือให้ใช้ได้)`);
        return;
      }
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    try {
      const existing = items.find((i) => i.id === editingId) ?? null;
      let id = existing?.id ?? "";
      // label_en is only written when there is something to write (or to clear), so saving
      // keeps working before delivery-customer-label-en.sql has been run
      const base = {
        label: label.trim(),
        quantity: q,
        unit: unit.trim() || null,
        ...(labelEn.trim() || existing?.labelEn ? { label_en: labelEn.trim() || null } : {}),
      };

      if (!existing) {
        const { data, error: insErr } = await supabase
          .from("delivery_customer_items_mf")
          .insert({ delivery_id: deliveryId, sort_order: items.length, ...base })
          .select("id")
          .single();
        if (insErr || !data) throw insErr ?? new Error("บันทึกไม่สำเร็จ");
        id = data.id;
      }

      let imagePath: string | null | undefined = undefined; // undefined = leave as is
      if (file) imagePath = await uploadImage(supabase, id, file);
      else if (removeImage) imagePath = null;

      const { error: updErr } = await supabase
        .from("delivery_customer_items_mf")
        .update({ ...base, ...(imagePath !== undefined ? { image_path: imagePath } : {}) })
        .eq("id", id);
      if (updErr) throw updErr;

      // how much of each prep-sheet line goes into this customer line
      if (linksReady) {
        const { error: clearErr } = await supabase.from("delivery_customer_links_mf").delete().eq("customer_item_id", id);
        if (clearErr) throw clearErr;
        if (chosen.length > 0) {
          const { error: linkErr } = await supabase
            .from("delivery_customer_links_mf")
            .insert(chosen.map((c) => ({ customer_item_id: id, delivery_item_id: c.id, quantity: c.quantity })));
          if (linkErr) throw linkErr;
        }
      }

      if (existing?.imagePath && (file || removeImage)) {
        await supabase.storage.from("delivery-docs").remove([existing.imagePath]);
      }
      setEditingId(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "บันทึกไม่สำเร็จ");
    }
    setBusy(false);
  }

  // swap with the neighbour and renumber the customer lines 0..n-1
  async function move(item: CustomerItem, direction: -1 | 1) {
    const from = items.findIndex((i) => i.id === item.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = items.map((i) => i.id);
    [next[from], next[to]] = [next[to], next[from]];
    setBusy(true);
    setError("");
    const supabase = createClient();
    const results = await Promise.all(
      next.map((id, index) => supabase.from("delivery_customer_items_mf").update({ sort_order: index }).eq("id", id))
    );
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) { setError(failed.error.message); return; }
    router.refresh();
  }

  async function remove(item: CustomerItem) {
    if (!(await confirmDialog(`ลบ "${item.label}" ออกจากใบส่งงานลูกค้า? (ชิ้นที่ผูกไว้จะกลับไปแสดงแยกเป็นรายชิ้น)`, "ลบ"))) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("delivery_customer_items_mf").delete().eq("id", item.id);
    if (err) setError(err.message);
    else if (item.imagePath) await supabase.storage.from("delivery-docs").remove([item.imagePath]);
    setBusy(false);
    router.refresh();
  }

  const form = (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <textarea rows={3} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ชื่อที่ลูกค้าเห็น เช่น โต๊ะ 4 ที่นั่ง มีสกรีน (กด Enter เพื่อขึ้นบรรทัดใหม่ได้)" aria-label="ชื่อรายการสำหรับลูกค้า" className={area} />
      <textarea rows={3} value={labelEn} onChange={(e) => setLabelEn(e.target.value)} placeholder="ชื่อภาษาอังกฤษ (ไม่บังคับ ใช้ในใบส่งงานเวอร์ชันอังกฤษ)" aria-label="ชื่อภาษาอังกฤษ" className={area} />
      <div className="flex gap-2">
        <input type="number" inputMode="numeric" min="1" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="จำนวน" className={`${field} text-right`} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="หน่วย" aria-label="หน่วย" className={field} />
      </div>
      {linksReady && lines.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">
            ชิ้นส่วนที่ใช้ในรายการนี้ ติ๊กแล้วใส่จำนวนที่ใช้ (ส่วนนี้จะไม่แสดงแยกบนใบลูกค้า) ชิ้นเดียวกันแบ่งใช้หลายรายการได้
          </p>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {lines.map((l) => {
              const elsewhere = l.allocations.filter((a) => a.customerItemId !== editingId);
              const usedElsewhere = elsewhere.reduce((n, a) => n + a.quantity, 0);
              const max = l.quantity - usedElsewhere;
              const on = l.id in picked;
              return (
                <div key={l.id} className="flex items-start gap-3 px-3 py-2.5 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    aria-label={`ใช้ ${l.name}`}
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={on}
                    disabled={max <= 0 && !on}
                    onChange={(e) =>
                      setPicked((p) => {
                        const next = { ...p };
                        if (e.target.checked) next[l.id] = String(Math.max(1, max));
                        else delete next[l.id];
                        return next;
                      })
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p>{l.name}</p>
                    <p className="text-xs text-gray-500">
                      มี {l.quantity} {l.unit}
                      {usedElsewhere > 0 && ` · ใช้ในรายการอื่นแล้ว ${usedElsewhere}`}
                    </p>
                  </div>
                  {on && (
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={max}
                      value={picked[l.id]}
                      onChange={(e) => setPicked((p) => ({ ...p, [l.id]: e.target.value }))}
                      aria-label={`จำนวน ${l.name}`}
                      className="h-10 w-20 rounded-lg border border-gray-300 bg-white px-2 text-base text-right"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!linksReady && (
        <p className="text-xs text-amber-700">ยังเลือกชิ้นส่วนไม่ได้ (ต้องรัน SQL delivery-customer-links.sql ก่อน)</p>
      )}
      <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-100">
        📷 {file ? file.name : "เลือกรูปสินค้าสำหรับลูกค้า"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveImage(false); }} />
      </label>
      {items.find((i) => i.id === editingId)?.imagePath && !file && (
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} className="h-4 w-4" />
          ลบรูปเดิมออก
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className={`${btn} border-brand bg-brand text-white`}>บันทึก</button>
        <button onClick={() => { setEditingId(null); setError(""); }} disabled={busy} className={`${btn} border-gray-300 bg-white text-gray-700`}>ยกเลิก</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-gray-900">รายการสำหรับใบส่งงานลูกค้า</p>
        <p className="text-xs text-gray-500">
          ลูกค้าเห็นเป็นรายการเหล่านี้ (ชื่อ จำนวน และรูป) ส่วนใบเตรียมของยังแยกชิ้นเหมือนเดิม ถ้ายังไม่มีรายการ ใบส่งงานจะแสดงเป็นรายชิ้น
        </p>
      </div>

      {items.map((item) =>
        editingId === item.id ? (
          <div key={item.id}>{form}</div>
        ) : (
          <div key={item.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.label} className="w-14 h-14 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500 shrink-0">ไม่มีรูป</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-900 whitespace-pre-line">{item.label}</p>
                {item.labelEn && <p className="text-xs text-gray-500 whitespace-pre-line">EN: {item.labelEn}</p>}
                <span className="font-medium whitespace-nowrap">{item.quantity} {item.unit}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.assigned.length > 0 ? `รวมชิ้น: ${item.assigned.join(", ")}` : "ยังไม่ได้เลือกชิ้นส่วน (กด แก้ไข แล้วติ๊กชิ้นที่ใช้)"}
              </p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => startEdit(item)} className={`${btn} border-gray-300 bg-white text-gray-700 active:bg-gray-100`}>✏️ แก้ไข</button>
                  <button onClick={() => remove(item)} disabled={busy} className={`${btn} border-red-300 bg-white text-red-600 active:bg-red-50`}>ลบ</button>
                  {items.length > 1 && (
                    <span className="ml-auto flex gap-2">
                      <button
                        onClick={() => move(item, -1)}
                        disabled={busy || items[0].id === item.id}
                        aria-label="เลื่อนขึ้น"
                        className={`${btn} w-9 border-gray-300 bg-white text-gray-700 active:bg-gray-100`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(item, 1)}
                        disabled={busy || items[items.length - 1].id === item.id}
                        aria-label="เลื่อนลง"
                        className={`${btn} w-9 border-gray-300 bg-white text-gray-700 active:bg-gray-100`}
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {canEdit &&
        (editingId === "new" ? (
          form
        ) : (
          <button
            onClick={() => startEdit(null)}
            className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
          >
            + เพิ่มรายการสำหรับลูกค้า
          </button>
        ))}
    </div>
  );
}
