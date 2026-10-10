// link into /warranty/register that carries the stock-out order, so registrations are tied to it
export function registerHref(item: {
  id: string;
  product_id?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("expected", item.id);
  if (item.product_id) params.set("product", item.product_id);
  if (item.customer_name) params.set("customer", item.customer_name);
  if (item.project_name) params.set("project", item.project_name);
  return `/warranty/register?${params.toString()}`;
}
