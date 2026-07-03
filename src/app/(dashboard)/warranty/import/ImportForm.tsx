"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const EXTERNAL_BATCH_ID = "00000000-0000-0000-0000-000000000000";

const TEMPLATE_ROWS = [
  ["รหัส QR *", "ชื่อลูกค้า *", "ชื่อโปรเจค", "วันที่ซื้อ (YYYY-MM-DD) *", "ระยะประกัน (ปี)", "หมายเหตุ"],
  ["MF-00001", "บริษัท ABC จำกัด", "โปรเจค X", "2026-01-15", "2", ""],
  ["MF-00002", "คุณสมชาย", "", "2026-02-20", "1", ""],
];

interface Row {
  code: string;
  customer_name: string;
  project_name: string;
  purchase_date: string;
  warranty_years: number;
  notes: string;
  _error?: string;
}

function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === "," && !inQuote) {
          cols.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());
      return cols;
    });
}

function rowsToData(matrix: string[][]): Row[] {
  const [, ...data] = matrix; // skip header
  return data
    .filter((r) => r.some((c) => c))
    .map((r) => {
      const code = (r[0] ?? "").toUpperCase().trim();
      const customer_name = (r[1] ?? "").trim();
      const project_name = (r[2] ?? "").trim();
      const purchase_date = (r[3] ?? "").trim();
      const warranty_years = parseFloat(r[4] ?? "0") || 0;
      const notes = (r[5] ?? "").trim();

      let error = "";
      if (!code) error = "ไม่มีรหัส QR";
      else if (!customer_name) error = "ไม่มีชื่อลูกค้า";
      else if (!purchase_date || !/^\d{4}-\d{2}-\d{2}$/.test(purchase_date))
        error = "วันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)";

      return { code, customer_name, project_name, purchase_date, warranty_years, notes, _error: error || undefined };
    });
}

function downloadTemplate() {
  const csv = TEMPLATE_ROWS.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "warranty_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const matrix = parseCSV(text);
      if (matrix.length < 2) return;
      setRows(rowsToData(matrix));
    };
    reader.readAsText(file, "UTF-8");
  }

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  async function handleImport() {
    if (!validRows.length) return;
    setImporting(true);
    setProgress(0);

    const supabase = createClient();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 20
    const BATCH = 20;
    for (let i = 0; i < validRows.length; i += BATCH) {
      const chunk = validRows.slice(i, i + BATCH);
      const records = chunk.map((row) => {
        const warrantyMonths = Math.round(row.warranty_years * 12);
        let warrantyExpiresAt: string | null = null;
        if (warrantyMonths > 0) {
          const d = new Date(row.purchase_date);
          d.setMonth(d.getMonth() + warrantyMonths);
          warrantyExpiresAt = d.toISOString();
        }
        const numMatch = row.code.match(/(\d+)$/);
        const qrNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
        const prefixMatch = row.code.match(/^([A-Z]+)/i);
        const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "EXT";

        return {
          code: row.code,
          qr_number: qrNumber,
          prefix,
          batch_id: EXTERNAL_BATCH_ID,
          status: "registered",
          customer_name: row.customer_name,
          project_name: row.project_name || null,
          purchase_date: row.purchase_date,
          warranty_months: warrantyMonths,
          warranty_expires_at: warrantyExpiresAt,
          notes: row.notes || null,
          registered_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from("qr_codes_mf")
        .upsert(records, { onConflict: "code", ignoreDuplicates: false });

      if (error) {
        failed += chunk.length;
        errors.push(`แถว ${i + 1}–${i + chunk.length}: ${error.message}`);
      } else {
        success += chunk.length;
      }

      setProgress(Math.round(((i + chunk.length) / validRows.length) * 100));
    }

    setImporting(false);
    setResult({ success, failed, errors });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 ${result.failed === 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
          <p className="text-lg font-bold text-gray-900 mb-1">นำเข้าเสร็จแล้ว</p>
          <p className="text-sm text-green-700">✓ สำเร็จ {result.success} รายการ</p>
          {result.failed > 0 && <p className="text-sm text-red-600 mt-0.5">✗ ล้มเหลว {result.failed} รายการ</p>}
        </div>
        {result.errors.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1">
            {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
          </div>
        )}
        <button
          onClick={() => { setRows([]); setResult(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
          className="w-full h-12 rounded-xl bg-brand text-white font-medium text-sm"
        >
          นำเข้าไฟล์ถัดไป
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Step 1: Download template */}
      <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="font-semibold text-gray-900 text-sm">① ดาวน์โหลด Template</p>
        <p className="text-xs text-gray-500">เปิดใน Excel / Google Sheets แล้วกรอกข้อมูล บันทึกเป็น .csv</p>
        <button
          onClick={downloadTemplate}
          className="h-10 px-4 rounded-xl border border-gray-300 text-sm text-gray-700 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          ดาวน์โหลด template.csv
        </button>
      </div>

      {/* Step 2: Upload */}
      <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="font-semibold text-gray-900 text-sm">② อัปโหลดไฟล์ CSV</p>
        <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer bg-gray-50 active:bg-gray-100">
          <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-500">{fileName || "แตะเพื่อเลือกไฟล์ .csv"}</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">③ ตรวจสอบข้อมูล</p>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600 font-medium">{validRows.length} รายการพร้อม</span>
              {invalidRows.length > 0 && <span className="text-red-500">{invalidRows.length} ข้อผิดพลาด</span>}
            </div>
          </div>

          {/* Invalid rows */}
          {invalidRows.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-1">แถวที่มีปัญหา (จะถูกข้ามไป):</p>
              {invalidRows.slice(0, 5).map((r, i) => (
                <p key={i} className="text-xs text-red-600">• {r.code || "(ว่าง)"} — {r._error}</p>
              ))}
              {invalidRows.length > 5 && <p className="text-xs text-red-400">...และอีก {invalidRows.length - 5} แถว</p>}
            </div>
          )}

          {/* Valid rows preview */}
          <div className="space-y-1.5">
            {validRows.slice(0, 5).map((r, i) => (
              <div key={i} className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <span className="font-mono font-semibold text-gray-900">{r.code}</span>
                <span className="text-gray-500 ml-2">{r.customer_name}</span>
                {r.project_name && <span className="text-gray-400 ml-1">· {r.project_name}</span>}
                <span className="text-gray-400 ml-1">· {r.purchase_date}</span>
                {r.warranty_years > 0 && <span className="text-brand ml-1">· {r.warranty_years} ปี</span>}
              </div>
            ))}
            {validRows.length > 5 && (
              <p className="text-xs text-gray-400 text-center">...และอีก {validRows.length - 5} รายการ</p>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-center">กำลังนำเข้า... {progress}%</p>
            </div>
          )}

          {validRows.length > 0 && !importing && (
            <button
              onClick={handleImport}
              className="w-full h-12 rounded-xl bg-brand text-white font-semibold text-sm"
            >
              นำเข้า {validRows.length} รายการ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
