import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { getCurrentUserRole } from "@/lib/auth";
import { DeleteExpectedButton } from "./DeleteExpectedButton";

async function getExpected() {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_out_expected_mf")
    .select("*, products_mf(id, name, model, unit, image_urls)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

function registeredKey(productId: string, customerName: string, projectName: string | null) {
  return `${productId}|${customerName}|${projectName ?? ""}`;
}

async function getRegisteredCounts(items: any[]) {
  const productIds = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
  if (productIds.length === 0) return new Map<string, number>();

  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("product_id, customer_name, project_name")
    .eq("status", "registered")
    .in("product_id", productIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = registeredKey(row.product_id, row.customer_name, row.project_name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function groupByCustomer(items: any[]) {
  const groups = new Map<string, { customer: string; project: string | null; items: any[] }>();
  for (const item of items) {
    const key = `${item.customer_name}|${item.project_name ?? ""}`;
    if (!groups.has(key)) {
      groups.set(key, { customer: item.customer_name, project: item.project_name, items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values());
}

function registerHref(item: any) {
  const params = new URLSearchParams();
  if (item.product_id) params.set("product", item.product_id);
  if (item.customer_name) params.set("customer", item.customer_name);
  if (item.project_name) params.set("project", item.project_name);
  return `/warranty/register?${params.toString()}`;
}

function RegisterStatus({ item, registeredCounts }: { item: any; registeredCounts: Map<string, number> }) {
  const target = item.sold_quantity;
  if (target === 0) return null;
  const registered = registeredCounts.get(registeredKey(item.product_id, item.customer_name, item.project_name)) ?? 0;

  if (registered >= target) {
    return (
      <p className="text-xs text-green-600 mt-1 text-right">
        ✓ ลงทะเบียนประกันแล้ว {registered}/{target}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2 mt-1">
      {registered > 0 && <span className="text-xs text-amber-600">ลงทะเบียนแล้ว {registered}/{target}</span>}
      <Link href={registerHref(item)} className="text-xs text-brand underline px-1">
        ลงทะเบียนประกัน →
      </Link>
    </div>
  );
}

export default async function ExpectedStockOutPage() {
  const [items, role] = await Promise.all([getExpected(), getCurrentUserRole()]);
  const registeredCounts = await getRegisteredCounts(items);
  const open = items.filter((i: any) => i.status === "open");
  const closed = items.filter((i: any) => i.status === "closed");
  const openGroups = groupByCustomer(open);
  const closedGroups = groupByCustomer(closed);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <Link href="/stock-out" className="text-sm text-brand block mb-2">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-900">รายการที่รอส่งออก</h1>
          <p className="text-gray-500 text-sm">{open.length} รายการค้างส่ง</p>
        </div>
        {role === "admin" && (
          <Link
            href="/stock-out/expected/new"
            className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            + แจ้งล่วงหน้า
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">ยังไม่มีรายการแจ้งล่วงหน้า</p>
        </div>
      ) : (
        <div className="space-y-6">
          {openGroups.map((group) => (
            <div key={`open-${group.customer}-${group.project}`}>
              <h2 className="font-semibold text-gray-900 mb-2">
                {group.customer}{group.project ? ` · ${group.project}` : ""}
              </h2>
              <div className="space-y-2">
                {group.items.map((item: any) => {
                  const pct = Math.min(100, Math.round((item.sold_quantity / item.expected_quantity) * 100));
                  const remaining = item.expected_quantity - item.sold_quantity;
                  return (
                    <div key={item.id}>
                      {role === "admin" && (
                        <div className="flex justify-end items-center gap-1 mb-1">
                          <Link href={`/stock-out/expected/${item.id}/edit`} className="text-xs text-brand underline px-1">
                            แก้ไข
                          </Link>
                          {item.sold_quantity === 0 && <DeleteExpectedButton id={item.id} />}
                        </div>
                      )}
                      <Link href={`/stock-out/new?expected=${item.id}`}>
                        <Card className="py-3 active:scale-95 transition-transform">
                          <div className="flex items-center gap-3">
                            {item.products_mf?.image_urls?.[0] ? (
                              <Image src={item.products_mf.image_urls[0]} alt={item.products_mf.name} width={80} height={56} className="h-14 w-auto max-w-20 rounded-lg object-contain shrink-0 bg-gray-50" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xl">📦</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {item.products_mf?.name ?? "-"}
                                  {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                                </p>
                                <span className="text-xs font-semibold text-brand shrink-0">
                                  {item.sold_quantity}/{item.expected_quantity}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                                <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">เหลืออีก {remaining} {item.products_mf?.unit}</p>
                              {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                            </div>
                          </div>
                        </Card>
                      </Link>
                      <RegisterStatus item={item} registeredCounts={registeredCounts} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {closedGroups.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">ปิดรายการแล้ว</h2>
              <div className="space-y-5">
                {closedGroups.map((group) => (
                  <div key={`closed-${group.customer}-${group.project}`}>
                    <h3 className="font-medium text-gray-700 text-sm mb-2">
                      {group.customer}{group.project ? ` · ${group.project}` : ""}
                    </h3>
                    <div className="space-y-2">
                      {group.items.map((item: any) => (
                        <div key={item.id}>
                          <Card className="py-3 opacity-70">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {item.products_mf?.name ?? "-"}
                                  {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  ส่งแล้ว {item.sold_quantity}/{item.expected_quantity} {item.products_mf?.unit}
                                  {item.closed_at && ` · ปิดเมื่อ ${formatDate(item.closed_at)}`}
                                </p>
                              </div>
                              <Badge variant={item.sold_quantity >= item.expected_quantity ? "success" : "warning"}>
                                {item.sold_quantity >= item.expected_quantity ? "ครบ" : "บางส่วน"}
                              </Badge>
                            </div>
                          </Card>
                          <RegisterStatus item={item} registeredCounts={registeredCounts} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
