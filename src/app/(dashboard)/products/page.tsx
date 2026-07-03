import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

async function getProducts() {
  const supabase = createClient();
  const { data } = await supabase
    .from("products_mf")
    .select("*, categories_mf(name)")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สินค้า</h1>
          <p className="text-gray-500 text-sm">{products.length} รายการ</p>
        </div>
        <Link
          href="/products/new"
          className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
        >
          <span>+</span> เพิ่มสินค้า
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500">ยังไม่มีสินค้า</p>
          <Link href="/products/new" className="text-brand text-sm mt-2 inline-block">
            + เพิ่มสินค้าใหม่
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p: any) => {
            const isLow = p.current_stock <= p.min_stock_level;
            return (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="flex items-center gap-3 active:scale-95 transition-transform">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-2xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      {p.model && (
                        <span className="text-xs text-gray-400">{p.model}</span>
                      )}
                    </div>
                    {p.brand && <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>}
                    {p.categories_mf?.name && (
                      <Badge variant="info" className="mt-1">{p.categories_mf.name}</Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${isLow ? "text-red-500" : "text-gray-900"}`}>
                      {p.current_stock}
                    </p>
                    <p className="text-xs text-gray-400">{p.unit}</p>
                    {isLow && <Badge variant="warning" className="mt-1">ใกล้หมด</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
