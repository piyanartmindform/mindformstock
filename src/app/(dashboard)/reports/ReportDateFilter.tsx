"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ReportDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(params.toString() ? `/reports?${params.toString()}` : "/reports");
  }

  function clear() {
    setFrom("");
    setTo("");
    router.push("/reports");
  }

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="จากวันที่"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          max={to || undefined}
        />
        <Input
          label="ถึงวันที่"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from || undefined}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={apply} className="flex-1">กรอง</Button>
        {(from || to || searchParams.get("from") || searchParams.get("to")) && (
          <Button variant="ghost" onClick={clear}>ล้าง</Button>
        )}
      </div>
    </Card>
  );
}
