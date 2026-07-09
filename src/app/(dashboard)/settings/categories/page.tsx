import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "./CategoryManager";

async function getCategories() {
  const supabase = createClient();
  const { data } = await supabase.from("categories_mf").select("*").order("name");
  return data ?? [];
}

export default async function CategorySettingsPage() {
  const categories = await getCategories();
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <Link href="/settings" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">หมวดหมู่สินค้า</h1>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
