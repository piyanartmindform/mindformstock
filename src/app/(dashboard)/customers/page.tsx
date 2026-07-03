import { createClient } from "@/lib/supabase/server";
import { CustomerList } from "./CustomerList";

async function getData() {
  const supabase = createClient();

  const [custRes, warrantyRes, stockOutRes] = await Promise.all([
    supabase.from("customers_mf").select("id, name, notes, created_at").order("name"),
    supabase
      .from("qr_codes_mf")
      .select("customer_name")
      .eq("status", "registered")
      .not("customer_name", "is", null),
    supabase
      .from("stock_out_mf")
      .select("customer_name")
      .not("customer_name", "is", null),
  ]);

  // Count warranties and sales per customer name
  const warrantyCount: Record<string, number> = {};
  for (const w of warrantyRes.data ?? []) {
    warrantyCount[w.customer_name] = (warrantyCount[w.customer_name] ?? 0) + 1;
  }
  const saleCount: Record<string, number> = {};
  for (const s of stockOutRes.data ?? []) {
    saleCount[s.customer_name] = (saleCount[s.customer_name] ?? 0) + 1;
  }

  const customers = (custRes.data ?? []).map((c: any) => ({
    ...c,
    warrantyCount: warrantyCount[c.name] ?? 0,
    saleCount: saleCount[c.name] ?? 0,
  }));

  return customers;
}

export default async function CustomersPage() {
  const customers = await getData();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">รายชื่อลูกค้า</h1>
        <p className="text-gray-500 text-sm">{customers.length} ราย</p>
      </div>
      <CustomerList customers={customers} />
    </div>
  );
}
