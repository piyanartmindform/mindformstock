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
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from("categories_mf")
      .insert({ name: newName.trim(), sort_order: nextSortOrder })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setNewName("");
    }
    setLoading(false);
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= categories.length) return;
    const a = categories[idx];
    const b = categories[swapIdx];
    const supabase = createClient();
    const [res1, res2] = await Promise.all([
      supabase.from("categories_mf").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("categories_mf").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (!res1.error && !res2.error) {
      const next = [...categories];
      next[idx] = { ...a, sort_order: b.sort_order };
      next[swapIdx] = { ...b, sort_order: a.sort_order };
      next.sort((x, y) => x.sort_order - y.sort_order);
      setCategories(next);
    }
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
        {categories.map((c, i) => (
          <Card key={c.id} className="py-3 flex items-center justify-between gap-2">
            <div className="flex flex-col shrink-0">
              <button
                onClick={() => moveCategory(c.id, "up")}
                disabled={i === 0}
                className="w-6 h-6 flex items-center justify-center text-gray-400 disabled:opacity-25"
                aria-label="เลื่อนขึ้น"
              >
                ▲
              </button>
              <button
                onClick={() => moveCategory(c.id, "down")}
                disabled={i === categories.length - 1}
                className="w-6 h-6 flex items-center justify-center text-gray-400 disabled:opacity-25"
                aria-label="เลื่อนลง"
              >
                ▼
              </button>
            </div>
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
