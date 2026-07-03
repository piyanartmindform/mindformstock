import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getStockInHistory() {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_mf")
    .select("*, products_mf(name, model, unit)")
    .order("received_date", { ascending: false })
    .limit(100);
  return data ?? [];
}

export default async function StockInPage() {
  const items = await getStockInHistory();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ประวัติรับเข้า</h1>
          <p className="text-gray-500 text-sm">{items.length} รายการ</p>
        </div>
        <Link
          href="/stock-in/new"
          className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
        >
          + รับเข้า
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📥</p>
          <p className="text-gray-500">ยังไม่มีประวัติรับเข้า</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <Link key={item.id} href={`/stock-in/${item.id}`}>
              <Card className="py-3 active:scale-95 transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {item.products_mf?.name ?? "-"}
                      {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                    </p>
                    {item.supplier && <p className="text-xs text-gray-400 mt-0.5">{item.supplier}</p>}
                    {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-green-600">+{item.quantity} {item.products_mf?.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.received_date)}</p>
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
