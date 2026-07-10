"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Branch {
  id: string;
  name: string;
}

export function BranchManager({ customerId, initialBranches }: { customerId: string; initialBranches: Branch[] }) {
  const [branches, setBranches] = useState(initialBranches);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function addBranch() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("customer_branches_mf")
      .insert({ customer_id: customerId, name: newName.trim() })
      .select("id, name")
      .single();
    setLoading(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "มีสาขา/โปรเจคนี้อยู่แล้ว" : insertError.message);
      return;
    }
    setBranches((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "th")));
    setNewName("");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("customer_branches_mf")
      .update({ name: editName.trim() })
      .eq("id", id);
    if (!updateError) {
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, name: editName.trim() } : b)));
      setEditId(null);
    }
  }

  async function deleteBranch(id: string) {
    if (!confirm("ลบสาขา/โปรเจคนี้?")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("customer_branches_mf").delete().eq("id", id);
    if (!deleteError) {
      setBranches((prev) => prev.filter((b) => b.id !== id));
    }
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">สาขา / โปรเจค</h2>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อสาขา / โปรเจคใหม่"
            onKeyDown={(e) => e.key === "Enter" && addBranch()}
            className="flex-1"
          />
          <Button onClick={addBranch} loading={loading} className="shrink-0">+ เพิ่ม</Button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}

        {branches.map((b) => (
          <Card key={b.id} className="py-3 flex items-center justify-between gap-2">
            {editId === b.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(b.id)}
                  className="flex-1 h-9"
                  autoFocus
                />
                <Button size="sm" onClick={() => saveEdit(b.id)}>บันทึก</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>ยกเลิก</Button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900 flex-1">{b.name}</span>
                <button
                  onClick={() => { setEditId(b.id); setEditName(b.name); }}
                  className="text-xs text-brand hover:underline px-1"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => deleteBranch(b.id)}
                  className="text-xs text-red-500 hover:underline px-1"
                >
                  ลบ
                </button>
              </>
            )}
          </Card>
        ))}
        {branches.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีสาขา/โปรเจค</p>
        )}
      </div>
    </div>
  );
}
