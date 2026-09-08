"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const CSV_HEADERS = ["ชื่อลูกค้า/บริษัท", "ชื่อผู้ติดต่อ", "เบอร์ติดต่อ", "ที่อยู่บริษัท", "Tax ID", "หมายเหตุ"];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

interface Customer {
  id: string;
  name: string;
  notes: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  warrantyCount: number;
  saleCount: number;
}

export function CustomerList({ customers: initial }: { customers: Customer[] }) {
  const [customers, setCustomers] = useState(initial);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      .insert({
        name: newName.trim(),
        contact_person: newContactPerson.trim() || null,
        phone: newPhone.trim() || null,
        address: newAddress.trim() || null,
        tax_id: newTaxId.trim() || null,
        notes: newNotes.trim() || null,
      })
      .select("id, name, notes, contact_person, phone, address, tax_id")
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
    setNewContactPerson("");
    setNewPhone("");
    setNewAddress("");
    setNewTaxId("");
    setNewNotes("");
    setShowAdd(false);
  }

  function handleDownloadTemplate() {
    const csv = "﻿" + CSV_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMessage(null);

    const text = await file.text();
    const rows = parseCSV(text.replace(/^﻿/, ""));
    const dataRows = rows.slice(1); // skip header row
    const payload = dataRows
      .map((r) => ({
        name: (r[0] ?? "").trim(),
        contact_person: (r[1] ?? "").trim() || null,
        phone: (r[2] ?? "").trim() || null,
        address: (r[3] ?? "").trim() || null,
        tax_id: (r[4] ?? "").trim() || null,
        notes: (r[5] ?? "").trim() || null,
      }))
      .filter((r) => r.name);

    if (payload.length === 0) {
      setImporting(false);
      setImportMessage({ type: "error", text: "ไม่พบข้อมูลลูกค้าที่นำเข้าได้ในไฟล์" });
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers_mf")
      .upsert(payload, { onConflict: "name" })
      .select("id, name, notes, contact_person, phone, address, tax_id");

    setImporting(false);
    if (error) {
      setImportMessage({ type: "error", text: error.message });
      return;
    }

    setCustomers((prev) => {
      const byName = new Map(prev.map((c) => [c.name, c]));
      for (const d of data ?? []) {
        const existing = byName.get(d.name);
        byName.set(d.name, { ...d, warrantyCount: existing?.warrantyCount ?? 0, saleCount: existing?.saleCount ?? 0 });
      }
      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "th"));
    });
    setImportMessage({ type: "success", text: `นำเข้าสำเร็จ ${data?.length ?? 0} รายชื่อ` });
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

      {/* Template + Import */}
      <div className="flex items-center gap-3 text-xs">
        <button type="button" onClick={handleDownloadTemplate} className="text-brand underline underline-offset-2">
          ดาวน์โหลด Template (CSV)
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="text-brand underline underline-offset-2 disabled:opacity-50"
        >
          {importing ? "กำลังนำเข้า..." : "นำเข้ารายชื่อจาก CSV"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
      </div>
      {importMessage && (
        <p className={`text-xs ${importMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {importMessage.text}
        </p>
      )}

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
            value={newContactPerson}
            onChange={(e) => setNewContactPerson(e.target.value)}
            placeholder="ชื่อผู้ติดต่อ"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="เบอร์ติดต่อ"
            inputMode="tel"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <textarea
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="ที่อยู่บริษัท"
            rows={2}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <input
            value={newTaxId}
            onChange={(e) => setNewTaxId(e.target.value)}
            placeholder="เลขประจำตัวผู้เสียภาษี (Tax ID)"
            inputMode="numeric"
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
            <Link key={c.id} href={`/customers/${encodeURIComponent(c.name)}`}>
              <Card className="py-3 active:scale-95 transition-transform">
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
