import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { WarrantyList } from "./WarrantyList";
import { InProgressJobs, type InProgressJob } from "./InProgressJobs";

async function getQRCodes() {
  const supabase = createClient();
  // PostgREST caps one response at 1000 rows, so page through until everything is loaded
  const pageSize = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await supabase
      .from("qr_codes_mf")
      .select("*, products_mf(name, model)")
      .eq("status", "registered")
      .order("registered_at", { ascending: false })
      .range(from, from + pageSize - 1);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

// orders where registration has started (some units registered) but not all sold units yet
async function getInProgressJobs(): Promise<InProgressJob[]> {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("stock_out_expected_mf")
    .select("id, product_id, customer_name, project_name, sold_quantity, products_mf(name, model)")
    .gt("sold_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(300);
  if (!orders || orders.length === 0) return [];

  const registered = new Map<string, number>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data } = await supabase
      .from("qr_codes_mf")
      .select("stock_out_expected_id")
      .eq("status", "registered")
      .not("stock_out_expected_id", "is", null)
      .range(from, from + pageSize - 1);
    for (const r of data ?? []) {
      registered.set(r.stock_out_expected_id, (registered.get(r.stock_out_expected_id) ?? 0) + 1);
    }
    if (!data || data.length < pageSize) break;
  }

  return (orders as any[])
    .map((o) => ({
      id: o.id,
      product_id: o.product_id,
      customer_name: o.customer_name,
      project_name: o.project_name,
      sold: o.sold_quantity,
      registered: registered.get(o.id) ?? 0,
      productName: `${o.products_mf?.name ?? "-"}${o.products_mf?.model ? ` · ${o.products_mf.model}` : ""}`,
    }))
    .filter((j) => j.registered > 0 && j.registered < j.sold);
}

export default async function WarrantyPage() {
  const [items, role, jobs] = await Promise.all([getQRCodes(), getCurrentUserRole(), getInProgressJobs()]);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ประกันสินค้า</h1>
          <p className="text-gray-500 text-sm">{items.length} รายการที่ลงทะเบียนแล้ว</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`grid gap-2 ${role === "admin" ? "grid-cols-2" : "grid-cols-1"}`}>
        <Link
          href="/warranty/register"
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-brand text-white font-medium text-sm"
        >
          <span>✍️</span> ลงทะเบียนประกัน
        </Link>
        {role === "admin" && (
          <Link
            href="/warranty/generate"
            className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gray-900 text-white font-medium text-sm"
          >
            <span>🏷️</span> สร้าง QR Batch
          </Link>
        )}
      </div>

      <InProgressJobs jobs={jobs} />

      <WarrantyList items={items} />
    </div>
  );
}
