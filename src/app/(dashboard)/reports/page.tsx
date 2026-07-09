import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ReportDateFilter } from "./ReportDateFilter";

async function getReportData(from?: string, to?: string) {
  const supabase = createClient();

  let stockInQuery = supabase
    .from("stock_in_mf")
    .select("*, products_mf(name, model, unit)")
    .order("received_date", { ascending: false });
  let stockOutQuery = supabase
    .from("stock_out_mf")
    .select("*, products_mf(name, model, unit)")
    .order("sold_date", { ascending: false });

  if (from) {
    stockInQuery = stockInQuery.gte("received_date", from);
    stockOutQuery = stockOutQuery.gte("sold_date", from);
  }
  if (to) {
    stockInQuery = stockInQuery.lte("received_date", to);
    stockOutQuery = stockOutQuery.lte("sold_date", to);
  }
  if (!from && !to) {
    stockInQuery = stockInQuery.limit(200);
    stockOutQuery = stockOutQuery.limit(200);
  }

  const [stockInRes, stockOutRes] = await Promise.all([stockInQuery, stockOutQuery]);
  return {
    stockIn: stockInRes.data ?? [],
    stockOut: stockOutRes.data ?? [],
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const { stockIn, stockOut } = await getReportData(searchParams.from, searchParams.to);

  const totalIn = stockIn.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalOut = stockOut.reduce((s: number, i: any) => s + i.quantity, 0);
  const isFiltered = Boolean(searchParams.from || searchParams.to);
  const historyLabel = isFiltered ? "ประวัติรับเข้า" : "ประวัติรับเข้า (ล่าสุด)";
  const historyOutLabel = isFiltered ? "ประวัติขายออก" : "ประวัติขายออก (ล่าสุด)";

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
      </div>

      <ReportDateFilter />

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
        <h2 className="font-semibold text-gray-900 mb-3">{historyLabel}</h2>
        <div className="space-y-2">
          {(isFiltered ? stockIn : stockIn.slice(0, 20)).map((item: any) => (
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
          {isFiltered && stockIn.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบรายการในช่วงวันที่นี้</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">{historyOutLabel}</h2>
        <div className="space-y-2">
          {(isFiltered ? stockOut : stockOut.slice(0, 20)).map((item: any) => (
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
          {isFiltered && stockOut.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบรายการในช่วงวันที่นี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
