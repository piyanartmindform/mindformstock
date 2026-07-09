"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { UserRole } from "@/types/database";

interface UserRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  email: string;
}

export function UserManager({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addUser() {
    setError(null);
    if (!email.trim() || !password) {
      setError("กรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim(), role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    setUsers((prev) => [...prev, data]);
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("staff");
    setShowAdd(false);
  }

  async function changeRole(id: string, newRole: UserRole) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
      router.refresh();
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("ลบ user นี้? การกระทำนี้ย้อนกลับไม่ได้")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      {!showAdd ? (
        <Button onClick={() => setShowAdd(true)} fullWidth>
          + เพิ่ม User
        </Button>
      ) : (
        <Card className="space-y-3">
          <Input label="อีเมล" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          <Input label="รหัสผ่าน" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
          <Input label="ชื่อ" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล (ไม่บังคับ)" />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={addUser} loading={loading} className="flex-1">บันทึก</Button>
            <Button variant="ghost" onClick={() => { setShowAdd(false); setError(null); }}>ยกเลิก</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || "(ไม่มีชื่อ)"}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              {u.id !== currentUserId && (
                <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:underline px-1 shrink-0">
                  ลบ
                </button>
              )}
            </div>
            <Select
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
              disabled={u.id === currentUserId}
              className="h-9 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </Card>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มี user</p>}
      </div>
    </div>
  );
}
