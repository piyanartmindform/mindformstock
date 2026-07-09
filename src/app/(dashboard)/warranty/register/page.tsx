import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";
import Link from "next/link";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, default_warranty_months, image_urls")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export default async function RegisterWarrantyPage() {
  const products = await getProducts();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/warranty" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">ลงทะเบียนประกัน</h1>
        <p className="text-sm text-gray-500 mt-1">ผูก QR สติ๊กเกอร์กับข้อมูลลูกค้า</p>
      </div>
      <RegisterForm products={products} />
    </div>
  );
}
