import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EditProductForm } from "./EditProductForm";

async function getData(id: string) {
  const supabase = createClient();
  const [productRes, categoriesRes] = await Promise.all([
    supabase.from("products_mf").select("*").eq("id", id).single(),
    supabase.from("categories_mf").select("*").order("name"),
  ]);
  if (productRes.error) return null;
  return { product: productRes.data, categories: categoriesRes.data ?? [] };
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href={`/products/${params.id}`} className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขสินค้า</h1>
      </div>
      <EditProductForm product={data.product} categories={data.categories} />
    </div>
  );
}
