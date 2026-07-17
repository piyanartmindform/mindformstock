import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import { NewExpectedOutForm } from "./NewExpectedOutForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, image_urls, categories_mf(name)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as any;
}

export default async function NewExpectedOutPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/stock-out/expected");

  const products = await getProducts();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/stock-out/expected" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">แจ้งขายล่วงหน้า</h1>
        <p className="text-sm text-gray-500 mt-1">บอกจำนวนที่ลูกค้าสั่งไว้ ทีมส่งของจะสแกนนับถอยหลังให้ครบทีหลัง</p>
      </div>
      <NewExpectedOutForm products={products} />
    </div>
  );
}
