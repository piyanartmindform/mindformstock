"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  STATUS_DATE_COLUMN,
  STATUS_LABEL,
  nextStatus,
  prevStatus,
  type DeliveryStatus,
} from "@/lib/deliveries";

interface Details {
  scheduled_date: string;
  delivery_address: string;
  receiver_name: string;
  note: string;
}

export function DeliveryActions({
  id,
  status,
  photoCount,
  initial,
}: {
  id: string;
  status: DeliveryStatus;
  photoCount: number;
  initial: Details;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<Details>(initial);
  const next = nextStatus(status);
  const prev = prevStatus(status);

  async function run(fn: () => Promise<{ message: string } | null | void>) {
    setBusy(true);
    setError("");
    const err = await fn();
    if (err) setError(err.message);
    setBusy(false);
    router.refresh();
  }

  function advance() {
    if (!next) return;
    if (next === "delivered" && photoCount === 0 && !confirm("ยังไม่ได้แนบรูปใบส่งงานที่ลูกค้าเซ็น ต้องการเปลี่ยนเป็น \"ส่งมอบแล้ว\" เลยไหม?")) return;
    if (next === "scheduled" && !details.scheduled_date && !confirm("ยังไม่ได้ระบุวันนัดส่ง ต้องการเปลี่ยนเป็น \"นัดส่งแล้ว\" เลยไหม?")) return;
    const col = STATUS_DATE_COLUMN[next]!;
    run(async () => {
      const { error } = await createClient()
        .from("deliveries_mf")
        .update({ status: next, [col]: new Date().toISOString() })
        .eq("id", id);
      return error;
    });
  }

  function revert() {
    if (!prev) return;
    if (!confirm(`ย้อนสถานะกลับเป็น "${STATUS_LABEL[prev]}"?`)) return;
    const col = STATUS_DATE_COLUMN[status];
    run(async () => {
      const { error } = await createClient()
        .from("deliveries_mf")
        .update({ status: prev, ...(col ? { [col]: null } : {}) })
        .eq("id", id);
      return error;
    });
  }

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const { error } = await createClient()
        .from("deliveries_mf")
        .update({
          scheduled_date: details.scheduled_date || null,
          delivery_address: details.delivery_address || null,
          receiver_name: details.receiver_name || null,
          note: details.note || null,
        })
        .eq("id", id);
      return error;
    });
  }

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    run(async () => {
      const supabase = createClient();
      const paths: string[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("delivery-docs").upload(path, f);
        if (error) return error;
        paths.push(path);
      }
      const { data } = await supabase.from("deliveries_mf").select("signed_doc_paths").eq("id", id).single();
      const { error } = await supabase
        .from("deliveries_mf")
        .update({ signed_doc_paths: [...(data?.signed_doc_paths ?? []), ...paths] })
        .eq("id", id);
      return error;
    });
  }

  async function remove() {
    if (!confirm("ลบรอบส่งนี้? ลบแล้วกู้คืนไม่ได้")) return;
    setBusy(true);
    const { error } = await createClient().from("deliveries_mf").delete().eq("id", id);
    if (error) { setError(error.message); setBusy(false); return; }
    router.push("/deliveries");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {next && (
        <Button fullWidth loading={busy} onClick={advance}>
          เปลี่ยนเป็น "{STATUS_LABEL[next]}"
        </Button>
      )}

      <label className="h-12 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer active:bg-sky-100">
        📷 แนบรูปใบส่งงานที่ลูกค้าเซ็น
        <input type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={busy} />
      </label>

      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="h-12 px-4 flex items-center text-sm font-medium text-gray-700 cursor-pointer">
          ✏️ แก้ไขรายละเอียด
        </summary>
        <form onSubmit={saveDetails} className="p-4 pt-0 space-y-3">
          <label className="block text-sm text-gray-700">
            วันนัดส่ง/ติดตั้ง
            <input
              type="date"
              value={details.scheduled_date}
              onChange={(e) => setDetails({ ...details, scheduled_date: e.target.value })}
              className="mt-1 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base"
            />
          </label>
          <label className="block text-sm text-gray-700">
            ที่อยู่ส่ง
            <textarea
              rows={3}
              value={details.delivery_address}
              onChange={(e) => setDetails({ ...details, delivery_address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base"
            />
          </label>
          <label className="block text-sm text-gray-700">
            ผู้รับหน้างาน
            <input
              value={details.receiver_name}
              onChange={(e) => setDetails({ ...details, receiver_name: e.target.value })}
              className="mt-1 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base"
            />
          </label>
          <label className="block text-sm text-gray-700">
            หมายเหตุ
            <textarea
              rows={2}
              value={details.note}
              onChange={(e) => setDetails({ ...details, note: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base"
            />
          </label>
          <Button type="submit" variant="secondary" fullWidth loading={busy}>บันทึกรายละเอียด</Button>
        </form>
      </details>

      <div className="flex flex-wrap gap-2 justify-end">
        {prev && (
          <button
            onClick={revert}
            disabled={busy}
            className="inline-flex items-center h-8 px-2.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 active:bg-gray-100 disabled:opacity-50"
          >
            ← ย้อนสถานะ
          </button>
        )}
        {status === "confirmed" && (
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center h-8 px-2.5 rounded-lg border border-red-300 bg-white text-xs font-medium text-red-600 active:bg-red-50 disabled:opacity-50"
          >
            ลบรอบส่ง
          </button>
        )}
      </div>
    </div>
  );
}
