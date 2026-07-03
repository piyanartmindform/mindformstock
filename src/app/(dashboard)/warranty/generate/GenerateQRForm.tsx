"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent";

export function GenerateQRForm({ nextNumber }: { nextNumber: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedStart, setSuggestedStart] = useState<number | null>(null);
  const [prefix, setPrefix] = useState("MF");
  const [startNum, setStartNum] = useState(nextNumber);
  const [qty, setQty] = useState(128);

  const pad = (n: number) => String(n).padStart(5, "0");
  const pre = prefix.trim().toUpperCase() || "MF";
  const previewStart = `${pre}-${pad(startNum)}`;
  const previewEnd = `${pre}-${pad(startNum + qty - 1)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const batchId = `${Date.now()}`;
    const res = await fetch("/api/warranty/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: pre, startNumber: startNum, quantity: qty, batchId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      if (data.nextAvailable) setSuggestedStart(data.nextAvailable);
      setLoading(false);
      return;
    }
    setSuggestedStart(null);

    router.push(`/warranty/print?batch=${batchId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Prefix (ตัวอักษรนำหน้า)</label>
        <input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          className={inputClass}
          maxLength={5}
          placeholder="MF"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">เลขเริ่มต้น</label>
          <input
            type="number"
            inputMode="numeric"
            value={startNum}
            onChange={(e) => setStartNum(Number(e.target.value))}
            className={inputClass}
            min="1"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">จำนวน (ดวง)</label>
          <input
            type="number"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className={inputClass}
            min="1"
            max="500"
            required
          />
        </div>
      </div>

      <div className="rounded-xl bg-brand/5 border border-brand/20 p-4">
        <p className="text-xs text-gray-500 mb-1">ตัวอย่างรหัสที่จะสร้าง</p>
        <p className="font-mono font-bold text-brand text-lg">{previewStart}</p>
        <p className="font-mono text-sm text-gray-500">ถึง {previewEnd}</p>
        <p className="text-xs text-gray-400 mt-1">ทั้งหมด {qty} ดวง</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          {suggestedStart && (
            <button
              type="button"
              onClick={() => { setStartNum(suggestedStart); setSuggestedStart(null); setError(""); }}
              className="text-sm font-medium text-brand underline"
            >
              เปลี่ยนเป็นเลขเริ่มต้น {suggestedStart}
            </button>
          )}
        </div>
      )}

      <Button type="submit" fullWidth loading={loading}>
        สร้าง QR และพิมพ์
      </Button>
    </form>
  );
}
