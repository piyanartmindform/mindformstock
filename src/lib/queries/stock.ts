import { createClient } from "@/lib/supabase/server";
import type { StockIn, StockOut } from "@/types/database";

export async function getStockInHistory(limit = 50): Promise<StockIn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_in_mf")
    .select("*, products_mf(id, name, model, unit)")
    .order("received_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getStockOutHistory(limit = 50): Promise<StockOut[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_out_mf")
    .select("*, products_mf(id, name, model, unit)")
    .order("sold_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getProductStockHistory(productId: string) {
  const supabase = createClient();
  const [inRes, outRes] = await Promise.all([
    supabase
      .from("stock_in_mf")
      .select("*")
      .eq("product_id", productId)
      .order("received_date", { ascending: false }),
    supabase
      .from("stock_out_mf")
      .select("*")
      .eq("product_id", productId)
      .order("sold_date", { ascending: false }),
  ]);
  return {
    stockIn: inRes.data ?? [],
    stockOut: outRes.data ?? [],
  };
}
