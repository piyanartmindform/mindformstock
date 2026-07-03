import { createClient } from "@/lib/supabase/server";
import { NewProductForm } from "./NewProductForm";

async function getCategories() {
  const supabase = createClient();
  const { data } = await supabase.from("categories_mf").select("*").order("name");
  return data ?? [];
}

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/products" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">เพิ่มสินค้าใหม่</h1>
      </div>
      <NewProductForm categories={categories} />
    </div>
  );
}
