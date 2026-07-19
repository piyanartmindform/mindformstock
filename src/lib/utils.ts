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

export function formatDateRange(from: string, to: string): string {
  return from.slice(0, 10) === to.slice(0, 10)
    ? formatDateShort(from)
    : `${formatDateShort(from)} - ${formatDateShort(to)}`;
}

export function groupWarrantyByCustomerProduct<
  T extends {
    customer_name?: string | null;
    registered_at?: string | null;
    products_mf?: { name: string; model?: string | null; unit?: string | null; image_urls?: string[] | null } | null;
  }
>(
  items: T[]
): { customer_name: string; product_name: string; product_model: string | null; unit: string | null; image_url: string | null; quantity: number; earliest_date: string | null; latest_date: string | null }[] {
  const groups = new Map<
    string,
    { customer_name: string; product_name: string; product_model: string | null; unit: string | null; image_url: string | null; quantity: number; earliest_date: string | null; latest_date: string | null }
  >();
  for (const item of items) {
    const customerName = item.customer_name || "ไม่ระบุลูกค้า";
    const productName = item.products_mf?.name || "ไม่ระบุสินค้า";
    const key = `${customerName}__${productName}__${item.products_mf?.model ?? ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        customer_name: customerName,
        product_name: productName,
        product_model: item.products_mf?.model ?? null,
        unit: item.products_mf?.unit ?? null,
        image_url: item.products_mf?.image_urls?.[0] ?? null,
        quantity: 0,
        earliest_date: null,
        latest_date: null,
      });
    }
    const group = groups.get(key)!;
    group.quantity += 1;
    if (item.registered_at) {
      if (!group.earliest_date || item.registered_at < group.earliest_date) group.earliest_date = item.registered_at;
      if (!group.latest_date || item.registered_at > group.latest_date) group.latest_date = item.registered_at;
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.customer_name.localeCompare(b.customer_name, "th"));
}

export function groupStockInByProduct<
  T extends {
    quantity: number;
    supplier?: string | null;
    received_date?: string | null;
    products_mf?: { name: string; model?: string | null; unit?: string | null; image_urls?: string[] | null } | null;
  }
>(
  items: T[]
): { product_name: string; product_model: string | null; unit: string | null; image_url: string | null; quantity: number; supplier: string; earliest_date: string | null; latest_date: string | null }[] {
  const groups = new Map<
    string,
    { product_name: string; product_model: string | null; unit: string | null; image_url: string | null; quantity: number; suppliers: Set<string>; earliest_date: string | null; latest_date: string | null }
  >();
  for (const item of items) {
    const productName = item.products_mf?.name || "ไม่ระบุสินค้า";
    const key = `${productName}__${item.products_mf?.model ?? ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        product_name: productName,
        product_model: item.products_mf?.model ?? null,
        unit: item.products_mf?.unit ?? null,
        image_url: item.products_mf?.image_urls?.[0] ?? null,
        quantity: 0,
        suppliers: new Set(),
        earliest_date: null,
        latest_date: null,
      });
    }
    const group = groups.get(key)!;
    group.quantity += item.quantity;
    if (item.supplier) group.suppliers.add(item.supplier);
    if (item.received_date) {
      if (!group.earliest_date || item.received_date < group.earliest_date) group.earliest_date = item.received_date;
      if (!group.latest_date || item.received_date > group.latest_date) group.latest_date = item.received_date;
    }
  }
  return Array.from(groups.values())
    .map(({ suppliers, ...rest }) => ({ ...rest, supplier: suppliers.size > 0 ? Array.from(suppliers).join(", ") : "-" }))
    .sort((a, b) => a.product_name.localeCompare(b.product_name, "th"));
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
