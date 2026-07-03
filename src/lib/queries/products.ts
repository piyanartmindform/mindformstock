import { createClient } from "@/lib/supabase/server";
import type { Product, Category, LowStockProduct } from "@/types/database";

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products_mf")
    .select("*, categories_mf(id, name)")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products_mf")
    .select("*, categories_mf(id, name)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products_mf")
    .select("*, categories_mf(name)")
    .eq("is_active", true)
    .filter("current_stock", "lte", "min_stock_level");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    category_name: p.categories_mf?.name ?? null,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories_mf")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
