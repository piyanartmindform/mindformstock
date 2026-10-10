"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type CustomerType = "juristic" | "individual";

interface Props {
  customerName: string;
  warrantyCount: number;
  stockOutCount: number;
  customer: {
    id: string;
    name: string;
    notes: string | null;
    contact_person: string | null;
    phone: string | null;
    address: string | null;
    tax_id: string | null;
    customer_type: CustomerType;
  } | null;
}

export function CustomerDetailActions({ customerName, warrantyCount, stockOutCount, customer }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(customer?.name ?? customerName);
  const [editCustomerType, setEditCustomerType] = useState<CustomerType>(customer?.customer_type ?? "juristic");
  const [editContactPerson, setEditContactPerson] = useState(customer?.contact_person ?? "");
  const [editPhone, setEditPhone] = useState(customer?.phone ?? "");
  const [editAddress, setEditAddress] = useState(customer?.address ?? "");
  const [editTaxId, setEditTaxId] = useState(customer?.tax_id ?? "");
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

    const { data: updated, error: updateError } = await supabase
      .from("customers_mf")
      .update({
        name: trimmedName,
        customer_type: editCustomerType,
        contact_person: editContactPerson.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        tax_id: editTaxId.trim() || null,
        notes: editNotes.trim() || null,
      })
      .eq("id", customer.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      setSaving(false);
      setError(updateError.code === "23505" ? "ชื่อลูกค้านี้มีอยู่แล้ว" : updateError.message);
      return;
    }
    if (!updated) {
      // no row affected (e.g. RLS blocked the write) — don't touch other tables
      setSaving(false);
      setError("บันทึกไม่สำเร็จ ไม่มีสิทธิ์แก้ไขข้อมูลนี้");
      return;
    }

    // ชื่อลูกค้าถูกเก็บเป็น text ซ้ำในหลายตาราง (รายการที่รอส่งออก รายการขาย ประกัน รอบส่ง)
    // ต้องอัปเดตให้ตรงกันในครั้งเดียว ไม่งั้นประวัติเดิมจะเชื่อมกับลูกค้าคนนี้ไม่ได้อีก
    if (trimmedName !== customerName) {
      const { error: renameError } = await supabase.rpc("rename_customer_references", {
        p_old: customerName,
        p_new: trimmedName,
      });
      if (renameError) {
        setSaving(false);
        setError(`บันทึกข้อมูลลูกค้าแล้ว แต่เปลี่ยนชื่อในรายการอื่นไม่สำเร็จ: ${renameError.message}`);
        return;
      }
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
          <div className="flex items-center gap-2 mt-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">{customerName}</h1>
            {customer && (
              <Badge variant="gray">{customer.customer_type === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล"}</Badge>
            )}
          </div>
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

      {customer && !editing && (customer.contact_person || customer.phone || customer.address || customer.tax_id) && (
        <Card className="py-3 mt-3 space-y-1">
          {customer.contact_person && (
            <p className="text-sm text-gray-700">ผู้ติดต่อ: {customer.contact_person}</p>
          )}
          {customer.phone && <p className="text-sm text-gray-700">โทร: {customer.phone}</p>}
          {customer.address && <p className="text-sm text-gray-700 whitespace-pre-line">ที่อยู่: {customer.address}</p>}
          {customer.tax_id && <p className="text-sm text-gray-700">เลขผู้เสียภาษี: {customer.tax_id}</p>}
        </Card>
      )}

      {customer && editing && (
        <Card className="py-4 mt-3 border-brand/30 bg-brand/5">
          <div className="space-y-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="ชื่อลูกค้า / บริษัท *"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditCustomerType("juristic")}
                className={`flex-1 h-11 rounded-xl text-sm font-medium border ${editCustomerType === "juristic" ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300"}`}
              >
                นิติบุคคล
              </button>
              <button
                type="button"
                onClick={() => setEditCustomerType("individual")}
                className={`flex-1 h-11 rounded-xl text-sm font-medium border ${editCustomerType === "individual" ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300"}`}
              >
                บุคคลธรรมดา
              </button>
            </div>
            <input
              value={editContactPerson}
              onChange={(e) => setEditContactPerson(e.target.value)}
              placeholder="ชื่อผู้ติดต่อ"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="เบอร์ติดต่อ"
              inputMode="tel"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <textarea
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="ที่อยู่บริษัท"
              rows={2}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
            <input
              value={editTaxId}
              onChange={(e) => setEditTaxId(e.target.value)}
              placeholder="เลขประจำตัวผู้เสียภาษี (Tax ID)"
              inputMode="numeric"
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
