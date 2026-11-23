import { createClient } from "@/lib/supabase/server";

export interface CostRow {
  id: string;
  name: string;
  model: string | null;
  unit: string;
  stock: number;
  cost: number | null;
  value: number;
}

export interface CostGroup {
  category: string;
  rows: CostRow[];
  value: number;
}

export async function getCostReport() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("id, name, model, unit, current_stock, cost_thb, categories_mf(name)")
    .eq("is_active", true)
    .order("name");

  const groups = new Map<string, CostGroup>();
  let totalValue = 0;
  let totalUnits = 0;
  const missing: CostRow[] = [];

  for (const p of (data ?? []) as any[]) {
    const stock = Number(p.current_stock) || 0;
    const cost = p.cost_thb == null ? null : Number(p.cost_thb);
    if (cost == null && stock <= 0) continue; // nothing to report

    const row: CostRow = {
      id: p.id,
      name: p.name,
      model: p.model,
      unit: p.unit,
      stock,
      cost,
      value: (cost ?? 0) * Math.max(stock, 0),
    };
    if (cost == null) {
      missing.push(row);
      continue;
    }
    const category = p.categories_mf?.name ?? "ไม่ระบุหมวดหมู่";
    const g: CostGroup = groups.get(category) ?? { category, rows: [], value: 0 };
    g.rows.push(row);
    g.value += row.value;
    groups.set(category, g);
    totalValue += row.value;
    totalUnits += Math.max(stock, 0);
  }

  const sorted = Array.from(groups.values()).sort((a, b) => b.value - a.value);
  sorted.forEach((g) => g.rows.sort((a, b) => b.value - a.value));

  return { groups: sorted, missing, totalValue, totalUnits };
}

export function baht(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
