"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Category } from "@/types/database";

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  async function addCategory() {
    if (!newName.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories_mf")
      .insert({ name: newName.trim() })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setNewName("");
    }
    setLoading(false);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("categories_mf")
      .update({ name: editName.trim() })
      .eq("id", id);
    if (!error) {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: editName.trim() } : c));
      setEditId(null);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("ลบหมวดหมู่นี้?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories_mf").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
          className="flex-1"
        />
        <Button onClick={addCategory} loading={loading} className="shrink-0">
          + เพิ่ม
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <Card key={c.id} className="py-3 flex items-center justify-between gap-2">
            {editId === c.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                  className="flex-1 h-9"
                  autoFocus
                />
                <Button size="sm" onClick={() => saveEdit(c.id)}>บันทึก</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>ยกเลิก</Button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900 flex-1">{c.name}</span>
                <button
                  onClick={() => { setEditId(c.id); setEditName(c.name); }}
                  className="text-xs text-brand hover:underline px-1"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="text-xs text-red-500 hover:underline px-1"
                >
                  ลบ
                </button>
              </>
            )}
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีหมวดหมู่</p>
        )}
      </div>
    </div>
  );
}
