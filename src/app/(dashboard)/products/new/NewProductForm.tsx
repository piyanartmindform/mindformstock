"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { Category } from "@/types/database";

export function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      category_id: fd.get("category_id") || null,
      name: fd.get("name") as string,
      model: fd.get("model") || null,
      brand: fd.get("brand") || null,
      supplier: fd.get("supplier") || null,
      description: fd.get("description") || null,
      unit: fd.get("unit") as string || "ชิ้น",
      min_stock_level: Number(fd.get("min_stock_level")) || 0,
      default_warranty_months: Math.round(Number(fd.get("default_warranty_years")) * 12) || 0,
      current_stock: 0,
      image_urls: imageUrls,
      is_active: true,
    };

    const supabase = createClient();
    const { error } = await supabase.from("products_mf").insert(payload);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-28">
      <ImageUpload value={imageUrls} onChange={setImageUrls} />
      <Input label="ชื่อสินค้า *" name="name" required placeholder="เช่น มอเตอร์ไฟฟ้า" />

      <Select label="หมวดหมู่" name="category_id">
        <option value="">-- ไม่ระบุหมวดหมู่ --</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input label="รุ่น" name="model" placeholder="เช่น MX-200" />
        <Input label="ยี่ห้อ" name="brand" placeholder="เช่น SIEMENS" />
      </div>

      <Input label="ซัพพลายเออร์" name="supplier" placeholder="ชื่อซัพพลายเออร์" />

      <Input label="หน่วย" name="unit" defaultValue="ชิ้น" placeholder="ชิ้น / ชุด / อัน" />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="สต็อกขั้นต่ำ"
          name="min_stock_level"
          type="number"
          inputMode="numeric"
          defaultValue="0"
          min="0"
        />
        <Input
          label="ประกัน (ปี)"
          name="default_warranty_years"
          type="number"
          inputMode="numeric"
          defaultValue="0"
          min="0"
          step="0.5"
          placeholder="0 = ไม่มีประกัน"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">รายละเอียด</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="รายละเอียดเพิ่มเติม..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:p-0">
        <Button type="submit" fullWidth loading={loading}>
          บันทึกสินค้า
        </Button>
      </div>
    </form>
  );
}
