"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage({ text: "รหัสผ่านไม่ตรงกัน", ok: false });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", ok: false });
      return;
    }
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ text: error.message, ok: false });
    } else {
      setMessage({ text: "เปลี่ยนรหัสผ่านสำเร็จ", ok: true });
      setPassword("");
      setConfirm("");
    }
    setLoading(false);
  }

  return (
    <Card>
      <h2 className="font-semibold text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="รหัสผ่านใหม่"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          required
        />
        <Input
          label="ยืนยันรหัสผ่าน"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
          required
        />
        {message && (
          <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" loading={loading} fullWidth>
          บันทึกรหัสผ่าน
        </Button>
      </form>
    </Card>
  );
}
