import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getStockOutHistory() {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_out_mf")
    .select("*, products_mf(name, model, unit)")
    .order("sold_date", { ascending: false })
    .limit(100);
  return data ?? [];
}

async function getOpenExpectedCount() {
  const supabase = createClient();
  const { count } = await supabase
    .from("stock_out_expected_mf")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export default async function StockOutPage() {
  const [items, openExpectedCount] = await Promise.all([getStockOutHistory(), getOpenExpectedCount()]);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ประวัติขายออก</h1>
          <p className="text-gray-500 text-sm">{items.length} รายการ</p>
        </div>
        <Link
          href="/stock-out/new"
          className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
        >
          + ขายออก
        </Link>
      </div>

      <Link href="/stock-out/expected">
        <Card className="py-3 flex items-center justify-between active:scale-95 transition-transform">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-sm font-medium text-gray-900">รายการที่รอส่งออก</span>
          </div>
          {openExpectedCount > 0 ? (
            <span className="text-xs font-semibold text-white bg-brand rounded-full px-2.5 py-1">{openExpectedCount} ค้างส่ง</span>
          ) : (
            <span className="text-xs text-gray-400">ดูทั้งหมด →</span>
          )}
        </Card>
      </Link>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500">ยังไม่มีประวัติขาย</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <Link key={item.id} href={`/stock-out/${item.id}`}>
              <Card className="py-3 active:scale-95 transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {item.products_mf?.name ?? "-"}
                      {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.customer_name}
                      {item.project_name && ` · ${item.project_name}`}
                    </p>
                    {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-red-500">-{item.quantity} {item.products_mf?.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.sold_date)}</p>
                    {item.price && (
                      <p className="text-xs text-gray-500">฿{item.price.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
