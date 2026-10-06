import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StockInForm } from "./StockInForm";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, current_stock, default_warranty_months, image_urls, categories_mf(name, sort_order)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as any;
}

async function getExpected(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_expected_mf")
    .select("id, product_id, expected_quantity, received_quantity, status")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function getOpenExpectedCount() {
  const supabase = createClient();
  const { count } = await supabase
    .from("stock_in_expected_mf")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export default async function NewStockInPage({
  searchParams,
}: {
  searchParams: { product?: string; expected?: string };
}) {
  const [products, openExpectedCount] = await Promise.all([getProducts(), getOpenExpectedCount()]);
  const expected = searchParams.expected ? await getExpected(searchParams.expected) : null;

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <h1 className="text-xl font-bold text-gray-900">บันทึกรับสินค้าเข้า</h1>
        {!expected && openExpectedCount > 0 && (
          <Link href="/stock-in/expected" className="mt-3 flex items-center justify-between gap-2 min-h-12 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm font-medium text-amber-900 active:bg-amber-100">
            📋 มี {openExpectedCount} รายการรอรับเข้าล่วงหน้า — สแกนที่นี่แทน →
          </Link>
        )}
      </div>
      <StockInForm
        products={products}
        defaultProductId={expected?.product_id ?? searchParams.product}
        expected={expected}
      />
    </div>
  );
}
