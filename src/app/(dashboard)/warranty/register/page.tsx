import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";
import Link from "next/link";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, default_warranty_months, image_urls, categories_mf(name, sort_order)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as any;
}

async function getExpectedProgress(id?: string) {
  if (!id) return null;
  const supabase = createClient();
  const [{ data: expected }, { data: registeredRows }, { data: stockOutRows }] = await Promise.all([
    supabase
      .from("stock_out_expected_mf")
      .select("id, product_id, customer_name, project_name, sold_quantity")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("qr_codes_mf")
      .select("id")
      .eq("status", "registered")
      .eq("stock_out_expected_id", id),
    supabase
      .from("stock_out_mf")
      .select("id, quantity, sold_date")
      .eq("stock_out_expected_id", id)
      .order("sold_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (!expected || expected.sold_quantity <= 0) return null;
  return {
    ...expected,
    registered: registeredRows?.length ?? 0,
    stockOutBatches: stockOutRows ?? [],
  };
}

export default async function RegisterWarrantyPage({
  searchParams,
}: {
  searchParams: { expected?: string; product?: string; customer?: string; project?: string };
}) {
  const [products, progress] = await Promise.all([
    getProducts(),
    getExpectedProgress(searchParams.expected),
  ]);
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/warranty" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">ลงทะเบียนประกัน</h1>
        <p className="text-sm text-gray-500 mt-1">ผูก QR สติ๊กเกอร์กับข้อมูลลูกค้า</p>
      </div>
      <RegisterForm
        products={products}
        defaultProductId={progress?.product_id ?? searchParams.product}
        defaultCustomerName={progress?.customer_name ?? searchParams.customer}
        defaultProjectName={progress?.project_name ?? searchParams.project}
        expectedId={progress?.id}
        targetQuantity={progress?.sold_quantity}
        initialRegistered={progress?.registered}
        stockOutBatches={progress?.stockOutBatches}
      />
    </div>
  );
}
