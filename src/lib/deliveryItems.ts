import type { SupabaseClient } from "@supabase/supabase-js";

export const ITEM_SELECT =
  "id, expected_id, quantity, custom_name, custom_unit, custom_source, item_note, image_paths, products_mf(name, model, unit, image_urls), stock_out_expected_mf(expected_quantity)";

export function itemName(i: any): string {
  return i.products_mf?.name ?? i.custom_name ?? "-";
}

export function itemUnit(i: any): string {
  return i.products_mf?.unit ?? i.custom_unit ?? "";
}

export function productImage(i: any): string | null {
  return i.products_mf?.image_urls?.[0] ?? null;
}

export function isCustom(i: any): boolean {
  return !i.products_mf;
}

// path -> short-lived signed URL, for every photo on every line
export async function getItemPhotoUrls(supabase: SupabaseClient, items: any[]): Promise<Map<string, string>> {
  const paths = items.flatMap((i) => i.image_paths ?? []);
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await supabase.storage.from("delivery-docs").createSignedUrls(paths, 3600);
  for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  return urls;
}
