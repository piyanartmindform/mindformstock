import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getDashboardData() {
  const supabase = createClient();

  const [productsRes, lowStockRes, recentInRes, recentOutRes] = await Promise.all([
    supabase.from("products_mf").select("id, current_stock, min_stock_level").eq("is_active", true),
    supabase
      .from("products_mf")
      .select("id, name, model, current_stock, min_stock_level, unit")
      .eq("is_active", true)
      .filter("current_stock", "lte", "min_stock_level")
      .order("current_stock"),
    supabase
      .from("stock_in_mf")
      .select("id, received_date, supplier, quantity, products_mf(name, model, unit)")
      .order("received_date", { ascending: false })
      .limit(5),
    supabase
      .from("stock_out_mf")
      .select("id, sold_date, customer_name, project_name, quantity, products_mf(name, model, unit)")
      .order("sold_date", { ascending: false })
      .limit(5),
  ]);

  const products = productsRes.data ?? [];
  const totalProducts = products.length;
  const totalItems = products.reduce((s, p) => s + p.current_stock, 0);

  return {
    totalProducts,
    totalItems,
    lowStock: lowStockRes.data ?? [],
    recentIn: recentInRes.data ?? [],
    recentOut: recentOutRes.data ?? [],
  };
}

export default async function DashboardPage() {
  const { totalProducts, totalItems, lowStock, recentIn, recentOut } = await getDashboardData();

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">ภาพรวมสต็อกสินค้า</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/products">
          <Card className="active:scale-95 transition-transform cursor-pointer">
            <p className="text-sm text-gray-500">สินค้าทั้งหมด</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalProducts}</p>
            <p className="text-xs text-gray-400">รายการ</p>
          </Card>
        </Link>
        <Link href="/products">
          <Card className="active:scale-95 transition-transform cursor-pointer">
            <p className="text-sm text-gray-500">จำนวนรวม</p>
            <p className="text-3xl font-bold text-brand mt-1">{totalItems}</p>
            <p className="text-xs text-gray-400">ชิ้น</p>
          </Card>
        </Link>
        <Link href="/products">
          <Card className="active:scale-95 transition-transform cursor-pointer">
            <p className="text-sm text-gray-500">ใกล้หมด</p>
            <p className={`text-3xl font-bold mt-1 ${lowStock.length > 0 ? "text-red-500" : "text-green-500"}`}>
              {lowStock.length}
            </p>
            <p className="text-xs text-gray-400">รายการ</p>
          </Card>
        </Link>
        <Link href="/stock-out/new">
          <Card className="bg-brand text-white border-0 h-full flex flex-col justify-center active:scale-95 transition-transform">
            <p className="text-sm text-white/80">บันทึกขาย</p>
            <p className="text-2xl font-bold mt-1">+ ขายออก</p>
          </Card>
        </Link>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            สินค้าใกล้หมด
          </h2>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="flex items-center justify-between py-3 active:scale-95 transition-transform">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    {p.model && <p className="text-xs text-gray-400">{p.model}</p>}
                  </div>
                  <div className="text-right">
                    <Badge variant={p.current_stock === 0 ? "danger" : "warning"}>
                      เหลือ {p.current_stock} {p.unit}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">ขั้นต่ำ {p.min_stock_level}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Stock In */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">ประวัติรับเข้า (ล่าสุด)</h2>
          <Link href="/stock-in" className="text-sm text-brand">ดูทั้งหมด</Link>
        </div>
        <div className="space-y-2">
          {recentIn.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรายการรับเข้า</p>
          ) : (
            recentIn.map((item: any) => (
              <Link key={item.id} href={`/stock-in/${item.id}`}>
                <Card className="py-3 active:scale-95 transition-transform">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {item.products_mf?.name ?? "-"}
                        {item.products_mf?.model && (
                          <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.supplier || "ไม่ระบุซัพพลายเออร์"}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-green-600">
                        +{item.quantity} {item.products_mf?.unit}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(item.received_date)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent Stock Out */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">ประวัติขายออก (ล่าสุด)</h2>
          <Link href="/stock-out" className="text-sm text-brand">ดูทั้งหมด</Link>
        </div>
        <div className="space-y-2">
          {recentOut.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรายการขาย</p>
          ) : (
            recentOut.map((item: any) => (
              <Link key={item.id} href={`/stock-out/${item.id}`}>
                <Card className="py-3 active:scale-95 transition-transform">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {item.products_mf?.name ?? "-"}
                        {item.products_mf?.model && (
                          <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.customer_name}
                        {item.project_name && ` · ${item.project_name}`}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-red-500">
                        -{item.quantity} {item.products_mf?.unit}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(item.sold_date)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
