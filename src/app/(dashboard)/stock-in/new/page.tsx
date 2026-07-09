import { createClient } from "@/lib/supabase/server";
import { StockInForm } from "./StockInForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, current_stock, default_warranty_months, image_urls")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export default async function NewStockInPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const products = await getProducts();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <h1 className="text-xl font-bold text-gray-900">บันทึกรับสินค้าเข้า</h1>
      </div>
      <StockInForm products={products} defaultProductId={searchParams.product} />
    </div>
  );
}
