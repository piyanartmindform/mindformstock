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

export interface CustomerLine {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  imagePath: string | null;
  imageUrl: string | null;
}

export interface CustomerLink {
  customerItemId: string;
  deliveryItemId: string;
  quantity: number;
}

// Customer-facing lines of a round plus how much of each prep-sheet line goes into which. `ready`
// is false while delivery_customer_items_mf does not exist yet, `linksReady` while
// delivery_customer_links_mf does not, so pages keep working before the SQL is run.
export async function getCustomerLines(
  supabase: SupabaseClient,
  deliveryId: string
): Promise<{ ready: boolean; linksReady: boolean; lines: CustomerLine[]; links: CustomerLink[] }> {
  const { data, error } = await supabase
    .from("delivery_customer_items_mf")
    .select("id, label, quantity, unit, image_path")
    .eq("delivery_id", deliveryId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return { ready: false, linksReady: false, lines: [], links: [] };

  const paths = data.flatMap((r: any) => (r.image_path ? [r.image_path as string] : []));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("delivery-docs").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  let links: CustomerLink[] = [];
  let linksReady = false;
  if (data.length > 0) {
    const { data: linkRows, error: linkErr } = await supabase
      .from("delivery_customer_links_mf")
      .select("customer_item_id, delivery_item_id, quantity")
      .in("customer_item_id", data.map((r: any) => r.id));
    if (!linkErr) {
      linksReady = true;
      links = (linkRows ?? []).map((r: any) => ({
        customerItemId: r.customer_item_id,
        deliveryItemId: r.delivery_item_id,
        quantity: r.quantity,
      }));
    }
  } else {
    // nothing to link yet; check the table exists so the editor can offer the checklist
    const { error: probe } = await supabase.from("delivery_customer_links_mf").select("id").limit(1);
    linksReady = !probe;
  }

  return {
    ready: true,
    linksReady,
    lines: data.map((r: any) => ({
      id: r.id,
      label: r.label,
      quantity: r.quantity,
      unit: r.unit ?? "",
      imagePath: r.image_path ?? null,
      imageUrl: r.image_path ? urls.get(r.image_path) ?? null : null,
    })),
    links,
  };
}
