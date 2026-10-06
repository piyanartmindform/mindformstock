"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PhotoPicker } from "@/components/ui/PhotoPicker";

interface Item {
  id: string;
  product_id: string;
  name: string;
  model: string | null;
  unit: string;
  max: number;
}

interface StockLine {
  qty: string;
  note: string;
  files: File[];
}

interface CustomLine extends StockLine {
  key: number;
  name: string;
  unit: string;
  source: string;
}

const textarea =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent";
const smallInput = "h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base";

export function NewDeliveryForm({
  customer,
  project,
  items,
  defaultAddress,
}: {
  customer: string;
  project: string | null;
  items: Item[];
  defaultAddress: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stock, setStock] = useState<Record<string, StockLine>>(() =>
    Object.fromEntries(items.map((i) => [i.id, { qty: String(i.max), note: "", files: [] }]))
  );
  const [custom, setCustom] = useState<CustomLine[]>([]);

  const patchStock = (id: string, p: Partial<StockLine>) => setStock((s) => ({ ...s, [id]: { ...s[id], ...p } }));
  const patchCustom = (key: number, p: Partial<CustomLine>) =>
    setCustom((c) => c.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const addCustom = () =>
    setCustom((c) => [...c, { key: Date.now(), name: "", unit: "ชิ้น", source: "", qty: "1", note: "", files: [] }]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const stockChosen = items
      .map((i) => ({ item: i, line: stock[i.id], quantity: Number(stock[i.id].qty || 0) }))
      .filter((c) => c.quantity > 0);
    const over = stockChosen.find((c) => c.quantity > c.item.max);
    if (over) { setError(`${over.item.name} เกินจำนวนที่เหลือ (${over.item.max})`); return; }
    const badCustom = custom.find((l) => !l.name.trim() || !(Number(l.qty) > 0));
    if (badCustom) { setError("รายการสั่งทำต้องมีชื่อและจำนวนมากกว่า 0"); return; }
    if (stockChosen.length + custom.length === 0) { setError("กรุณาเพิ่มอย่างน้อย 1 รายการ"); return; }

    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: delivery, error: insertError } = await supabase
      .from("deliveries_mf")
      .insert({
        customer_name: customer,
        project_name: project,
        scheduled_date: fd.get("scheduled_date") || null,
        delivery_address: fd.get("delivery_address") || null,
        receiver_name: fd.get("receiver_name") || null,
        note: fd.get("note") || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (insertError || !delivery) { setError(insertError?.message ?? "บันทึกไม่สำเร็จ"); setLoading(false); return; }

    const rows: { row: Record<string, unknown>; files: File[] }[] = [
      ...stockChosen.map((c) => ({
        row: {
          delivery_id: delivery.id,
          expected_id: c.item.id,
          product_id: c.item.product_id,
          quantity: c.quantity,
          item_note: c.line.note.trim() || null,
        },
        files: c.line.files,
      })),
      ...custom.map((l) => ({
        row: {
          delivery_id: delivery.id,
          quantity: Number(l.qty),
          custom_name: l.name.trim(),
          custom_unit: l.unit.trim() || null,
          custom_source: l.source.trim() || null,
          item_note: l.note.trim() || null,
        },
        files: l.files,
      })),
    ];

    let photoFailed = false;
    for (const { row, files } of rows) {
      const { data: item, error: itemError } = await supabase
        .from("delivery_items_mf")
        .insert(row)
        .select("id")
        .single();
      if (itemError || !item) {
        await supabase.from("deliveries_mf").delete().eq("id", delivery.id);
        setError(itemError?.message ?? "บันทึกรายการไม่สำเร็จ");
        setLoading(false);
        return;
      }
      const paths: string[] = [];
      for (let n = 0; n < files.length; n++) {
        const f = files[n];
        try {
          const blob = await resizeImage(f);
          const path = `${delivery.id}/items/${item.id}-${n + 1}.jpg`;
          const { error: upErr } = await supabase.storage.from("delivery-docs").upload(path, blob, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          paths.push(path);
        } catch {
          photoFailed = true;
        }
      }
      if (paths.length > 0) await supabase.from("delivery_items_mf").update({ image_paths: paths }).eq("id", item.id);
    }

    if (photoFailed) alert("บันทึกรอบส่งแล้ว แต่แนบรูปบางรูปไม่สำเร็จ เพิ่มรูปได้ในหน้ารายละเอียด");
    router.push(`/deliveries/${delivery.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">สินค้าที่ส่งในรอบนี้</p>
        {items.map((i) => (
          <div key={i.id} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {i.name}{i.model && <span className="text-gray-500 font-normal"> · {i.model}</span>}
                </p>
                <p className="text-xs text-gray-500">เหลือวางแผนได้ {i.max} {i.unit}</p>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={i.max}
                value={stock[i.id].qty}
                onChange={(e) => patchStock(i.id, { qty: e.target.value })}
                aria-label={`จำนวน ${i.name}`}
                className="h-12 w-24 rounded-xl border border-gray-300 bg-white px-3 text-base text-right"
              />
            </div>
            <input
              value={stock[i.id].note}
              onChange={(e) => patchStock(i.id, { note: e.target.value })}
              placeholder="โน้ตของรายการนี้ (ไม่บังคับ)"
              className={smallInput}
            />
            <PhotoPicker files={stock[i.id].files} onChange={(files) => patchStock(i.id, { files })} />
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">ไม่มีสินค้าในระบบเหลือให้วางแผน เพิ่มรายการสั่งทำด้านล่างได้</p>
        )}
      </div>

      <div className="space-y-2">
        {custom.map((l) => (
          <div key={l.key} className="rounded-xl border border-amber-300 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">สั่งทำ / นอกสต็อก</span>
              <button
                type="button"
                onClick={() => setCustom((c) => c.filter((x) => x.key !== l.key))}
                className="inline-flex items-center h-8 px-2.5 rounded-lg border border-red-300 bg-white text-xs font-medium text-red-600 active:bg-red-50"
              >
                ลบรายการ
              </button>
            </div>
            <input
              value={l.name}
              onChange={(e) => patchCustom(l.key, { name: e.target.value })}
              placeholder="ชื่อรายการ เช่น โต๊ะประชุม 2.4 ม."
              aria-label="ชื่อรายการสั่งทำ"
              className={smallInput}
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={l.qty}
                onChange={(e) => patchCustom(l.key, { qty: e.target.value })}
                aria-label="จำนวน"
                className={`${smallInput} text-right`}
              />
              <input
                value={l.unit}
                onChange={(e) => patchCustom(l.key, { unit: e.target.value })}
                placeholder="หน่วย"
                aria-label="หน่วย"
                className={smallInput}
              />
            </div>
            <input
              value={l.source}
              onChange={(e) => patchCustom(l.key, { source: e.target.value })}
              placeholder="ผู้ผลิต / แหล่งที่มา (ไม่บังคับ)"
              className={smallInput}
            />
            <input
              value={l.note}
              onChange={(e) => patchCustom(l.key, { note: e.target.value })}
              placeholder="โน้ต เช่น สเปก สี ขนาด (ไม่บังคับ)"
              className={smallInput}
            />
            <PhotoPicker files={l.files} onChange={(files) => patchCustom(l.key, { files })} />
          </div>
        ))}
        <button
          type="button"
          onClick={addCustom}
          className="w-full min-h-12 rounded-xl border border-dashed border-gray-400 bg-white text-sm font-medium text-sky-800 active:bg-sky-50"
        >
          + เพิ่มรายการสั่งทำ / นอกสต็อก
        </button>
      </div>

      <Input label="วันนัดส่ง/ติดตั้ง" name="scheduled_date" type="date" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">ที่อยู่ส่ง</label>
        <textarea
          name="delivery_address"
          rows={3}
          defaultValue={defaultAddress}
          className={textarea}
          placeholder="ที่อยู่หน้างาน (ถ้าต่างจากที่อยู่ลูกค้า)"
        />
      </div>
      <Input label="ผู้รับหน้างาน" name="receiver_name" placeholder="ชื่อ / เบอร์โทร (ถ้ามี)" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">หมายเหตุ</label>
        <textarea name="note" rows={2} className={textarea} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>สร้างรอบส่ง</Button>
      </div>
    </form>
  );
}
