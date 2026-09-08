"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const CSV_HEADERS = ["ชื่อลูกค้า/บริษัท", "ประเภท (นิติบุคคล/บุคคลธรรมดา)", "ชื่อผู้ติดต่อ", "เบอร์ติดต่อ", "ที่อยู่บริษัท", "Tax ID", "หมายเหตุ"];

type CustomerType = "juristic" | "individual";

function parseCustomerType(value: string): CustomerType | null {
  const v = value.trim();
  if (!v) return null;
  return v === "บุคคลธรรมดา" || v.toLowerCase() === "individual" ? "individual" : "juristic";
}

// ตัดคำต่อท้ายบริษัท/เครื่องหมายวรรคตอนออกก่อนเทียบชื่อ เพื่อจับคู่ชื่อที่พิมพ์ต่างกันเล็กน้อยกับชื่อที่มีอยู่แล้ว
const SUFFIX_WORDS = ["บริษัท", "จำกัด (มหาชน)", "จำกัด", "หจก.", "co.,ltd.", "co., ltd.", "co ltd", "ltd.", "ltd", "limited", "inc.", "inc", "corp.", "corp"];

function normalizeName(raw: string): string {
  let s = raw.toLowerCase();
  for (const w of SUFFIX_WORDS) s = s.split(w.toLowerCase()).join("");
  return s.replace(/[()., \-]/g, "").trim();
}

function findBestMatch(name: string, candidates: string[]): string {
  const norm = normalizeName(name);
  if (!norm) return "";
  const exact = candidates.find((c) => normalizeName(c) === norm);
  if (exact) return exact;
  const partial = candidates.find((c) => {
    const cn = normalizeName(c);
    return cn.length >= 4 && norm.length >= 4 && (cn.includes(norm) || norm.includes(cn));
  });
  return partial ?? "";
}

function displayCustomerName(name: string): string {
  return name.replace(/^บริษัท\s*/, "").trim() || name;
}

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
  customer_type: CustomerType;
  warrantyCount: number;
  saleCount: number;
}

interface ImportRow {
  name: string;
  customer_type: CustomerType | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  matchTarget: string; // "" = สร้างลูกค้าใหม่, ไม่ว่าง = รวมเข้ากับลูกค้าเดิมชื่อนี้
}

export function CustomerList({ customers: initial }: { customers: Customer[] }) {
  const [customers, setCustomers] = useState(initial);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCustomerType, setNewCustomerType] = useState<CustomerType>("juristic");
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
  const [pendingImport, setPendingImport] = useState<ImportRow[] | null>(null);
  const [mappingOptions, setMappingOptions] = useState<string[]>([]);
  const [confirmingImport, setConfirmingImport] = useState(false);

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
        customer_type: newCustomerType,
        contact_person: newContactPerson.trim() || null,
        phone: newPhone.trim() || null,
        address: newAddress.trim() || null,
        tax_id: newTaxId.trim() || null,
        notes: newNotes.trim() || null,
      })
      .select("id, name, notes, contact_person, phone, address, tax_id, customer_type")
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
    setNewCustomerType("juristic");
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

  async function refetchCustomers() {
    const supabase = createClient();
    const [custRes, warrantyRes, stockOutRes] = await Promise.all([
      supabase
        .from("customers_mf")
        .select("id, name, notes, contact_person, phone, address, tax_id, customer_type")
        .order("name"),
      supabase.from("qr_codes_mf").select("customer_name").eq("status", "registered").not("customer_name", "is", null),
      supabase.from("stock_out_mf").select("customer_name").not("customer_name", "is", null),
    ]);
    const warrantyCount: Record<string, number> = {};
    for (const w of warrantyRes.data ?? []) warrantyCount[w.customer_name] = (warrantyCount[w.customer_name] ?? 0) + 1;
    const saleCount: Record<string, number> = {};
    for (const s of stockOutRes.data ?? []) saleCount[s.customer_name] = (saleCount[s.customer_name] ?? 0) + 1;
    setCustomers(
      (custRes.data ?? []).map((c: any) => ({
        ...c,
        warrantyCount: warrantyCount[c.name] ?? 0,
        saleCount: saleCount[c.name] ?? 0,
      }))
    );
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
    const parsedRows = dataRows
      .map((r) => ({
        name: (r[0] ?? "").trim(),
        customer_type: parseCustomerType(r[1] ?? ""),
        contact_person: (r[2] ?? "").trim() || null,
        phone: (r[3] ?? "").trim() || null,
        address: (r[4] ?? "").trim() || null,
        tax_id: (r[5] ?? "").trim() || null,
        notes: (r[6] ?? "").trim() || null,
      }))
      .filter((r) => r.name);

    // ชื่อซ้ำกันในไฟล์เดียวกัน — เก็บแถวสุดท้ายไว้
    const byName = new Map(parsedRows.map((r) => [r.name, r]));
    const uniqueRows = Array.from(byName.values());

    if (uniqueRows.length === 0) {
      setImporting(false);
      setImportMessage({ type: "error", text: "ไม่พบข้อมูลลูกค้าที่นำเข้าได้ในไฟล์" });
      return;
    }

    // รวบรวมชื่อลูกค้าที่มีอยู่แล้วในระบบ ทั้งจาก customers_mf และประวัติการขาย/ประกัน
    // เพื่อเสนอให้ผู้ใช้ map ชื่อในไฟล์เข้ากับลูกค้าเดิม แทนที่จะสร้างซ้ำ
    const supabase = createClient();
    const [fromSales, fromWarranty] = await Promise.all([
      supabase.from("stock_out_mf").select("customer_name").not("customer_name", "is", null),
      supabase.from("qr_codes_mf").select("customer_name").eq("status", "registered").not("customer_name", "is", null),
    ]);
    const known = new Set<string>();
    customers.forEach((c) => known.add(c.name));
    (fromSales.data ?? []).forEach((r: any) => r.customer_name && known.add(r.customer_name));
    (fromWarranty.data ?? []).forEach((r: any) => r.customer_name && known.add(r.customer_name));
    const knownNames = Array.from(known).sort((a, b) => a.localeCompare(b, "th"));

    setMappingOptions(knownNames);
    setPendingImport(uniqueRows.map((r) => ({ ...r, matchTarget: findBestMatch(r.name, knownNames) })));
    setImporting(false);
  }

  function updateMatchTarget(index: number, value: string) {
    setPendingImport((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, matchTarget: value } : r)) : prev));
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setConfirmingImport(true);
    setImportMessage(null);
    const supabase = createClient();

    const newRows = pendingImport.filter((r) => !r.matchTarget);
    const mergeRows = pendingImport.filter((r) => r.matchTarget);
    const errors: string[] = [];
    let mergedCount = 0;
    let createdCount = 0;

    for (const row of mergeRows) {
      const fields: Record<string, unknown> = {};
      if (row.customer_type) fields.customer_type = row.customer_type;
      if (row.contact_person) fields.contact_person = row.contact_person;
      if (row.phone) fields.phone = row.phone;
      if (row.address) fields.address = row.address;
      if (row.tax_id) fields.tax_id = row.tax_id;
      if (row.notes) fields.notes = row.notes;

      const existing = customers.find((c) => c.name === row.matchTarget);
      const { error } = existing
        ? await supabase.from("customers_mf").update(fields).eq("id", existing.id)
        : await supabase.from("customers_mf").insert({ name: row.matchTarget, customer_type: row.customer_type ?? "juristic", ...fields });

      if (error) errors.push(`${row.name}: ${error.message}`);
      else mergedCount++;
    }

    if (newRows.length > 0) {
      const payload = newRows.map((r) => ({
        name: r.name,
        customer_type: r.customer_type ?? "juristic",
        contact_person: r.contact_person,
        phone: r.phone,
        address: r.address,
        tax_id: r.tax_id,
        notes: r.notes,
      }));
      const { data, error } = await supabase.from("customers_mf").upsert(payload, { onConflict: "name" }).select("id");
      if (error) errors.push(`สร้างใหม่: ${error.message}`);
      else createdCount += data?.length ?? 0;
    }

    await refetchCustomers();
    setConfirmingImport(false);
    setPendingImport(null);
    setImportMessage(
      errors.length > 0
        ? { type: "error", text: `นำเข้าไม่สำเร็จบางรายการ: ${errors.join("; ")}` }
        : { type: "success", text: `นำเข้าสำเร็จ — สร้างใหม่ ${createdCount} ราย, รวมเข้าลูกค้าเดิม ${mergedCount} ราย` }
    );
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
          disabled={importing || !!pendingImport}
          className="text-brand underline underline-offset-2 disabled:opacity-50"
        >
          {importing ? "กำลังอ่านไฟล์..." : "นำเข้ารายชื่อจาก CSV"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
      </div>
      {importMessage && !pendingImport && (
        <p className={`text-xs ${importMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {importMessage.text}
        </p>
      )}

      {/* Import mapping review */}
      {pendingImport && (
        <Card className="p-4 space-y-3 border-brand/30 bg-brand/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">ตรวจสอบก่อนนำเข้า ({pendingImport.length} รายชื่อ)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              ถ้าชื่อนี้เป็นลูกค้าที่มีอยู่แล้ว (เช่น ชื่อย่อ/ชื่อเต็มต่างกัน) เลือก "ลูกค้าเดิม" เพื่อรวมข้อมูลเข้าไปแทนการสร้างซ้ำ
            </p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingImport.map((row, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5">
                <p className="text-sm font-medium text-gray-900">{row.name}</p>
                <select
                  value={row.matchTarget}
                  onChange={(e) => updateMatchTarget(idx, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">— สร้างเป็นลูกค้าใหม่ —</option>
                  {mappingOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {row.matchTarget && row.matchTarget !== row.name && (
                  <p className="text-[11px] text-brand">จะรวมข้อมูลเข้ากับลูกค้าเดิม "{row.matchTarget}"</p>
                )}
              </div>
            ))}
          </div>
          {importMessage && (
            <p className={`text-xs ${importMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {importMessage.text}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirmImport}
              disabled={confirmingImport}
              className="flex-1 h-11 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {confirmingImport ? "กำลังนำเข้า..." : `ยืนยันนำเข้า (${pendingImport.length})`}
            </button>
            <button
              type="button"
              onClick={() => { setPendingImport(null); setImportMessage(null); }}
              disabled={confirmingImport}
              className="h-11 px-4 border border-gray-300 rounded-xl text-sm text-gray-600 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </Card>
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewCustomerType("juristic")}
              className={`flex-1 h-11 rounded-xl text-sm font-medium border ${newCustomerType === "juristic" ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300"}`}
            >
              นิติบุคคล
            </button>
            <button
              type="button"
              onClick={() => setNewCustomerType("individual")}
              className={`flex-1 h-11 rounded-xl text-sm font-medium border ${newCustomerType === "individual" ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300"}`}
            >
              บุคคลธรรมดา
            </button>
          </div>
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{displayCustomerName(c.name)}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                    {c.customer_type === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล"}
                  </span>
                </div>
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
