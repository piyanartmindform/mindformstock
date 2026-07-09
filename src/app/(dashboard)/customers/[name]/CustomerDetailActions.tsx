"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";

interface Props {
  customerName: string;
  warrantyCount: number;
  stockOutCount: number;
  customer: { id: string; name: string; notes: string | null } | null;
}

export function CustomerDetailActions({ customerName, warrantyCount, stockOutCount, customer }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(customer?.name ?? customerName);
  const [editNotes, setEditNotes] = useState(customer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!customer) return;
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setSaving(true);
    setError("");
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("customers_mf")
      .update({ name: trimmedName, notes: editNotes.trim() || null })
      .eq("id", customer.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.code === "23505" ? "ชื่อลูกค้านี้มีอยู่แล้ว" : updateError.message);
      return;
    }

    // ชื่อลูกค้าถูกเก็บเป็น text ซ้ำใน stock_out_mf / qr_codes_mf ด้วย ต้องอัปเดตให้ตรงกัน
    // ไม่งั้นประวัติการขาย/ประกันเดิมจะเชื่อมกับลูกค้าคนนี้ไม่ได้อีก
    if (trimmedName !== customerName) {
      await Promise.all([
        supabase.from("stock_out_mf").update({ customer_name: trimmedName }).eq("customer_name", customerName),
        supabase.from("qr_codes_mf").update({ customer_name: trimmedName }).eq("customer_name", customerName),
      ]);
    }

    setSaving(false);
    router.push(`/customers/${encodeURIComponent(trimmedName)}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!customer) return;
    if (!confirm(`ลบ "${customerName}" ออกจากรายชื่อ?`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("customers_mf").delete().eq("id", customer.id);
    router.push("/customers");
    router.refresh();
  }

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/customers" className="text-brand text-sm">← รายชื่อลูกค้า</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2 truncate">{customerName}</h1>
          <p className="text-gray-500 text-sm">
            {warrantyCount} ประกัน · {stockOutCount} รายการขาย
          </p>
        </div>
        {customer && !editing && (
          <div className="flex gap-1 shrink-0 pt-6">
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-gray-400 hover:text-brand active:text-brand"
              aria-label="แก้ไข"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5v4.875c0 .621-.504 1.125-1.125 1.125H5.625a1.125 1.125 0 01-1.125-1.125V6.75c0-.621.504-1.125 1.125-1.125h4.875" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-400 hover:text-red-500 active:text-red-600 disabled:opacity-50"
              aria-label="ลบ"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {customer && editing && (
        <Card className="py-4 mt-3 border-brand/30 bg-brand/5">
          <div className="space-y-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="ชื่อลูกค้า / บริษัท *"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(""); }}
                className="h-11 px-4 border border-gray-300 rounded-xl text-sm text-gray-600"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
