import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "./CategoryManager";

async function getCategories() {
  const supabase = createClient();
  const { data } = await supabase.from("categories_mf").select("*").order("name");
  return data ?? [];
}

export default async function SettingsPage() {
  const categories = await getCategories();
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า</h1>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
