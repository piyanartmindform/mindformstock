import { createClient } from "@/lib/supabase/server";

export async function getReportData(from?: string, to?: string) {
  const supabase = createClient();

  let stockInQuery = supabase
    .from("stock_in_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .order("received_date", { ascending: false });
  let stockOutQuery = supabase
    .from("stock_out_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .order("sold_date", { ascending: false });
  let warrantyQuery = supabase
    .from("qr_codes_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .eq("status", "registered")
    .order("registered_at", { ascending: false });

  if (from) {
    stockInQuery = stockInQuery.gte("received_date", from);
    stockOutQuery = stockOutQuery.gte("sold_date", from);
    warrantyQuery = warrantyQuery.gte("registered_at", from);
  }
  if (to) {
    stockInQuery = stockInQuery.lte("received_date", to);
    stockOutQuery = stockOutQuery.lte("sold_date", to);
    warrantyQuery = warrantyQuery.lte("registered_at", `${to}T23:59:59.999`);
  }
  if (!from && !to) {
    stockInQuery = stockInQuery.limit(200);
    stockOutQuery = stockOutQuery.limit(200);
    warrantyQuery = warrantyQuery.limit(200);
  }

  const [stockInRes, stockOutRes, warrantyRes] = await Promise.all([
    stockInQuery,
    stockOutQuery,
    warrantyQuery,
  ]);
  return {
    stockIn: stockInRes.data ?? [],
    stockOut: stockOutRes.data ?? [],
    warranty: warrantyRes.data ?? [],
  };
}
