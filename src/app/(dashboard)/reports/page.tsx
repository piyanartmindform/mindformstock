import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getReportData() {
  const supabase = createClient();
  const [stockInRes, stockOutRes] = await Promise.all([
    supabase
      .from("stock_in_mf")
      .select("*, products_mf(name, model, unit)")
      .order("received_date", { ascending: false })
      .limit(200),
    supabase
      .from("stock_out_mf")
      .select("*, products_mf(name, model, unit)")
      .order("sold_date", { ascending: false })
      .limit(200),
  ]);
  return {
    stockIn: stockInRes.data ?? [],
    stockOut: stockOutRes.data ?? [],
  };
}

export default async function ReportsPage() {
  const { stockIn, stockOut } = await getReportData();

  const totalIn = stockIn.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalOut = stockOut.reduce((s: number, i: any) => s + i.quantity, 0);

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-gray-500">รับเข้าทั้งหมด</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalIn}</p>
          <p className="text-xs text-gray-400">ชิ้น ({stockIn.length} รายการ)</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">ขายออกทั้งหมด</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{totalOut}</p>
          <p className="text-xs text-gray-400">ชิ้น ({stockOut.length} รายการ)</p>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">ประวัติรับเข้า (ล่าสุด)</h2>
        <div className="space-y-2">
          {stockIn.slice(0, 20).map((item: any) => (
            <Link key={item.id} href={`/stock-in/${item.id}`}>
              <Card className="py-2.5 active:scale-95 transition-transform">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.products_mf?.name}</p>
                    <p className="text-xs text-gray-400">{item.supplier || "ไม่ระบุซัพพลายเออร์"}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-green-600 font-medium">+{item.quantity} {item.products_mf?.unit}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.received_date)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">ประวัติขายออก (ล่าสุด)</h2>
        <div className="space-y-2">
          {stockOut.slice(0, 20).map((item: any) => (
            <Link key={item.id} href={`/stock-out/${item.id}`}>
              <Card className="py-2.5 active:scale-95 transition-transform">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.products_mf?.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.customer_name}{item.project_name ? ` · ${item.project_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-red-500 font-medium">-{item.quantity} {item.products_mf?.unit}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.sold_date)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
