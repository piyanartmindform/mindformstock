import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import Link from "next/link";
import { NewDeliveryForm } from "./NewDeliveryForm";

export default async function NewDeliveryPage({
  searchParams,
}: {
  searchParams: { customer?: string; project?: string };
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/deliveries");

  const customer = searchParams.customer;
  if (!customer) redirect("/stock-out/expected");
  const project = searchParams.project || null;

  const supabase = createClient();
  let itemsQuery = supabase
    .from("stock_out_expected_mf")
    .select("id, product_id, expected_quantity, status, products_mf(name, model, unit, image_urls)")
    .eq("customer_name", customer)
    .order("created_at", { ascending: true });
  itemsQuery = project ? itemsQuery.eq("project_name", project) : itemsQuery.is("project_name", null);

  const [{ data: items }, { data: customerInfo }] = await Promise.all([
    itemsQuery,
    supabase.from("customers_mf").select("address").eq("name", customer).maybeSingle(),
  ]);

  let roundsQuery = supabase
    .from("deliveries_mf")
    .select("id, doc_no, status")
    .eq("customer_name", customer)
    .order("created_at", { ascending: false });
  roundsQuery = project ? roundsQuery.eq("project_name", project) : roundsQuery.is("project_name", null);
  const { data: existingRounds } = await roundsQuery;

  const expectedIds = (items ?? []).map((i: any) => i.id);
  const planned = new Map<string, number>();
  if (expectedIds.length > 0) {
    const { data: plannedRows } = await supabase
      .from("delivery_items_mf")
      .select("expected_id, quantity")
      .in("expected_id", expectedIds);
    for (const r of plannedRows ?? []) planned.set(r.expected_id, (planned.get(r.expected_id) ?? 0) + r.quantity);
  }

  // Stock may already be scanned out (item closed) before the round/document is made,
  // so closed items stay selectable; only quantity already put in other rounds is excluded.
  const available = (items ?? [])
    .map((i: any) => ({
      id: i.id,
      product_id: i.product_id,
      name: i.products_mf?.name ?? "-",
      model: i.products_mf?.model ?? null,
      unit: i.products_mf?.unit ?? "",
      image: i.products_mf?.image_urls?.[0] ?? null,
      max: i.expected_quantity - (planned.get(i.id) ?? 0),
      closed: i.status === "closed",
    }))
    .filter((i) => i.max > 0)
    .sort((a, b) => Number(a.closed) - Number(b.closed));

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/stock-out/expected" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">สร้างรอบส่ง</h1>
        <p className="text-sm text-gray-500 mt-1">
          {customer}{project ? ` · ${project}` : ""}
        </p>
      </div>
      {(existingRounds ?? []).length > 0 && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <p className="font-medium">
            {available.length === 0
              ? "สินค้าทุกรายการอยู่ในรอบส่งแล้ว ไม่ต้องสร้างซ้ำ แก้ไขหรือเพิ่มรายการได้ในรอบที่มีอยู่"
              : "ลูกค้า/โปรเจคนี้มีรอบส่งอยู่แล้ว ถ้าต้องการเพิ่มสินค้า ให้เพิ่มในรอบเดิมแทนการสร้างใหม่"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(existingRounds ?? []).map((r: any) => (
              <Link
                key={r.id}
                href={`/deliveries/${r.id}`}
                className="inline-flex items-center h-8 px-2.5 rounded-lg border border-sky-300 bg-white text-xs font-medium text-sky-800 active:bg-sky-100"
              >
                🚚 {r.doc_no}
              </Link>
            ))}
          </div>
        </div>
      )}
      <NewDeliveryForm
        customer={customer}
        project={project}
        items={available}
        defaultAddress={customerInfo?.address ?? ""}
      />
    </div>
  );
}
