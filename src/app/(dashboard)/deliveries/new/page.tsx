import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
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
    .select("id, product_id, expected_quantity, sold_quantity, products_mf(name, model, unit)")
    .eq("customer_name", customer)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  itemsQuery = project ? itemsQuery.eq("project_name", project) : itemsQuery.is("project_name", null);

  const [{ data: items }, { data: customerInfo }] = await Promise.all([
    itemsQuery,
    supabase.from("customers_mf").select("address").eq("name", customer).maybeSingle(),
  ]);

  const expectedIds = (items ?? []).map((i: any) => i.id);
  const planned = new Map<string, number>();
  if (expectedIds.length > 0) {
    const { data: plannedRows } = await supabase
      .from("delivery_items_mf")
      .select("expected_id, quantity")
      .in("expected_id", expectedIds);
    for (const r of plannedRows ?? []) planned.set(r.expected_id, (planned.get(r.expected_id) ?? 0) + r.quantity);
  }

  // Already-sold and already-planned quantities overlap once a round is shipped,
  // so the quantity still available to plan is expected minus whichever is larger.
  const available = (items ?? [])
    .map((i: any) => ({
      id: i.id,
      product_id: i.product_id,
      name: i.products_mf?.name ?? "-",
      model: i.products_mf?.model ?? null,
      unit: i.products_mf?.unit ?? "",
      max: i.expected_quantity - Math.max(i.sold_quantity, planned.get(i.id) ?? 0),
    }))
    .filter((i) => i.max > 0);

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/stock-out/expected" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">สร้างรอบส่ง</h1>
        <p className="text-sm text-gray-500 mt-1">
          {customer}{project ? ` · ${project}` : ""}
        </p>
      </div>
      <NewDeliveryForm
        customer={customer}
        project={project}
        items={available}
        defaultAddress={customerInfo?.address ?? ""}
      />
    </div>
  );
}
