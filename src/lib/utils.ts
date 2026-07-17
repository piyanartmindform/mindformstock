export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function isWarrantyActive(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

const NO_CATEGORY_LABEL = "ไม่มีหมวดหมู่";

export function groupProductsByCategory<T extends { categories_mf?: { name: string } | null }>(
  products: T[]
): { category: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const p of products) {
    const key = p.categories_mf?.name ?? NO_CATEGORY_LABEL;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === NO_CATEGORY_LABEL) return 1;
      if (b === NO_CATEGORY_LABEL) return -1;
      return a.localeCompare(b, "th");
    })
    .map(([category, items]) => ({ category, items }));
}
