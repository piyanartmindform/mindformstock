"use client";

import { useRef, useState } from "react";
import { QrScanner } from "@/components/ui/QrScanner";

interface QrCodeListInputProps {
  label: string;
  codes: string[];
  onChange: (codes: string[]) => void;
  /** ตรวจสอบรหัสก่อนเพิ่มเข้า list — return ข้อความ error ถ้าใช้ไม่ได้, undefined ถ้าใช้ได้ */
  validate: (code: string) => Promise<string | undefined>;
}

export function QrCodeListInput({ label, codes, onChange, validate }: QrCodeListInputProps) {
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addCode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    if (codes.includes(code)) {
      setError(`${code} ถูกสแกนไปแล้ว`);
      return;
    }
    setChecking(true);
    setError("");
    const validationError = await validate(code);
    setChecking(false);
    if (validationError) {
      setError(validationError);
      return;
    }
    onChange([...codes, code]);
    setManualCode("");
  }

  function removeCode(code: string) {
    onChange(codes.filter((c) => c !== code));
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    addCode(manualCode);
    inputRef.current?.focus();
  }

  function handleScan(code: string) {
    addCode(code);
    setShowScanner(false); // ปิดกล้องทันทีหลังสแกน 1 ดวง — ต้องกด "สแกน" ใหม่ทีละครั้งต่อสินค้า
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label} *</label>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="พิมพ์หรือยิงบาร์โค้ด แล้วกด Enter"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="h-[50px] px-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          สแกน
        </button>
      </form>

      {checking && <p className="text-xs text-gray-400">กำลังตรวจสอบ...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          สแกนแล้ว <strong className="text-gray-900">{codes.length}</strong> ดวง
        </p>
      </div>

      {codes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {codes.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-mono font-medium"
            >
              {code}
              <button
                type="button"
                onClick={() => removeCode(code)}
                className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center"
                aria-label={`ลบ ${code}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
