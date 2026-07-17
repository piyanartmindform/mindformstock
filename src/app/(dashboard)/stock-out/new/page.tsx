import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StockOutForm } from "./StockOutForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, current_stock, default_warranty_months, image_urls, categories_mf(name)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as any;
}

async function getExpected(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_out_expected_mf")
    .select("id, product_id, expected_quantity, sold_quantity, customer_name, project_name, status")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function getOpenExpectedCount() {
  const supabase = createClient();
  const { count } = await supabase
    .from("stock_out_expected_mf")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export default async function NewStockOutPage({
  searchParams,
}: {
  searchParams: { product?: string; expected?: string };
}) {
  const [products, openExpectedCount] = await Promise.all([getProducts(), getOpenExpectedCount()]);
  const expected = searchParams.expected ? await getExpected(searchParams.expected) : null;

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <h1 className="text-xl font-bold text-gray-900">บันทึกขายออก</h1>
        {!expected && openExpectedCount > 0 && (
          <Link href="/stock-out/expected" className="text-sm text-brand mt-1 inline-flex items-center gap-1">
            📋 มี {openExpectedCount} รายการรอส่งออกล่วงหน้า — ส่งที่นี่แทน →
          </Link>
        )}
        {!expected && <p className="text-gray-500 text-sm mt-1">บันทึกรายการขายสินค้าออก</p>}
      </div>
      <StockOutForm
        products={products}
        defaultProductId={expected?.product_id ?? searchParams.product}
        expected={expected}
      />
    </div>
  );
}
