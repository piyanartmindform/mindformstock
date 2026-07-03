"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  notes: string | null;
  warrantyCount: number;
  saleCount: number;
}

export function CustomerList({ customers: initial }: { customers: Customer[] }) {
  const [customers, setCustomers] = useState(initial);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const router = useRouter();

  const filtered = query.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : customers;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers_mf")
      .insert({ name: newName.trim(), notes: newNotes.trim() || null })
      .select("id, name, notes")
      .single();
    setAdding(false);
    if (error) {
      setAddError(error.code === "23505" ? "ชื่อลูกค้านี้มีอยู่แล้ว" : error.message);
      return;
    }
    setCustomers((prev) =>
      [...prev, { ...data, warrantyCount: 0, saleCount: 0 }].sort((a, b) => a.name.localeCompare(b.name, "th"))
    );
    setNewName("");
    setNewNotes("");
    setShowAdd(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบ "${name}" ออกจากรายชื่อ?`)) return;
    const supabase = createClient();
    await supabase.from("customers_mf").delete().eq("id", id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          onClick={() => { setShowAdd((v) => !v); setAddError(""); }}
          className="h-[50px] px-4 bg-brand text-white rounded-xl text-sm font-medium whitespace-nowrap"
        >
          + เพิ่ม
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-2xl border border-brand/30 bg-brand/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">เพิ่มลูกค้าใหม่</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อลูกค้า / บริษัท *"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="หมายเหตุ (ถ้ามี)"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="flex-1 h-11 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {adding ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="h-11 px-4 border border-gray-300 rounded-xl text-sm text-gray-600">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          {customers.length === 0 ? "ยังไม่มีรายชื่อลูกค้า — กด + เพิ่ม" : "ไม่พบรายการ"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="py-3">
              <div className="flex items-center gap-3">
                <Link href={`/customers/${encodeURIComponent(c.name)}`} className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  {c.notes && <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>}
                  <div className="flex gap-3 mt-1">
                    {c.warrantyCount > 0 && (
                      <span className="text-xs text-brand">{c.warrantyCount} ประกัน</span>
                    )}
                    {c.saleCount > 0 && (
                      <span className="text-xs text-gray-400">{c.saleCount} รายการขาย</span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-2 text-gray-400 hover:text-red-500 active:text-red-600 shrink-0"
                  aria-label="ลบ"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
