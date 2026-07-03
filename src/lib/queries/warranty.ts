import { createClient } from "@/lib/supabase/server";
import type { WarrantyItem } from "@/types/database";

export async function getWarrantyItems(limit = 50): Promise<WarrantyItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warranty_items_mf")
    .select("*, products_mf(id, name, model, brand)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getWarrantyItem(id: string): Promise<WarrantyItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warranty_items_mf")
    .select("*, products_mf(id, name, model, brand, unit)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getWarrantyItemsByStockOut(stockOutId: string): Promise<WarrantyItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warranty_items_mf")
    .select("*, products_mf(id, name, model, brand)")
    .eq("stock_out_id", stockOutId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
