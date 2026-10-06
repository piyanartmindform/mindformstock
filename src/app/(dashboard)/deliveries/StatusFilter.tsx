"use client";

import { useRouter } from "next/navigation";
import { DELIVERY_STATUSES, STATUS_LABEL } from "@/lib/deliveries";

export function StatusFilter({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(e.target.value ? `/deliveries?status=${e.target.value}` : "/deliveries")}
      aria-label="กรองตามสถานะ"
      className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-medium text-gray-900"
    >
      <option value="">ทุกสถานะ</option>
      {DELIVERY_STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
