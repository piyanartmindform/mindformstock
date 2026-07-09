import { createClient } from "@/lib/supabase/server";
import { NewExpectedForm } from "./NewExpectedForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, image_urls")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export default async function NewExpectedPage() {
  const products = await getProducts();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/stock-in/expected" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">แจ้งสินค้าเข้าล่วงหน้า</h1>
        <p className="text-sm text-gray-500 mt-1">บอกจำนวนที่คาดว่าจะเข้า ทีมรับของจะสแกนนับถอยหลังให้ครบทีหลัง</p>
      </div>
      <NewExpectedForm products={products} />
    </div>
  );
}
