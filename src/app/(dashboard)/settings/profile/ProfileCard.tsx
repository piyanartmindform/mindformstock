"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { UserRole } from "@/types/database";

export function ProfileCard({ email, fullName, role }: { email: string; fullName: string | null; role: UserRole }) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_own_full_name", { new_name: name.trim() || null });
    setSaving(false);
    if (error) {
      setMessage({ text: error.message, ok: false });
      return;
    }
    setMessage({ text: "บันทึกแล้ว", ok: true });
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">โปรไฟล์</h2>
        <Badge variant={role === "admin" ? "info" : "gray"}>{role === "admin" ? "Admin" : "Staff"}</Badge>
      </div>
      <p className="text-sm text-gray-500">{email}</p>
      <Input
        label="ชื่อ"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อ-นามสกุล"
      />
      {message && (
        <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-500"}`}>{message.text}</p>
      )}
      <Button onClick={handleSave} loading={saving} fullWidth>บันทึกชื่อ</Button>
    </Card>
  );
}
