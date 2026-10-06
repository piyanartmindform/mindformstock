import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewConversionForm } from "./NewConversionForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, current_stock, image_urls, categories_mf(name, sort_order)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as any;
}

export default async function NewConversionPage() {
  const products = await getProducts();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/conversions" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">ใบแปลงสภาพ</h1>
        <p className="text-sm text-gray-500 mt-1">
          ใช้สินค้า/ชิ้นส่วนอะไรไป และได้อะไรมา เช่น แปลงชุด 8 ที่นั่งเป็น 2 ที่นั่ง เหลือคานและกล่อง riser box
        </p>
      </div>
      <NewConversionForm products={products} />
    </div>
  );
}
