import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDateShort } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";

async function getProductDetail(id: string) {
  const supabase = createClient();
  const [productRes, stockInRes, stockOutRes] = await Promise.all([
    supabase.from("products_mf").select("*, categories_mf(name)").eq("id", id).single(),
    supabase.from("stock_in_mf").select("*").eq("product_id", id).order("received_date", { ascending: false }).limit(20),
    supabase.from("stock_out_mf").select("*").eq("product_id", id).order("sold_date", { ascending: false }).limit(20),
  ]);
  if (productRes.error) return null;
  return {
    product: productRes.data,
    stockIn: stockInRes.data ?? [],
    stockOut: stockOutRes.data ?? [],
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const data = await getProductDetail(params.id);
  if (!data) notFound();

  const { product: p, stockIn, stockOut } = data;
  const isLow = p.current_stock <= p.min_stock_level;

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <Link href="/products" className="text-sm text-brand mb-2 block">← สินค้าทั้งหมด</Link>
        {p.image_urls?.length > 0 && <ProductImage images={p.image_urls} alt={p.name} />}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
            {p.model && <p className="text-gray-500 text-sm">{p.brand ? `${p.brand} · ` : ""}{p.model}</p>}
          </div>
          <Link href={`/products/${p.id}/edit`} className="text-sm text-brand underline mt-1 shrink-0 ml-3">แก้ไข</Link>
        </div>
      </div>

      {/* Stock Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">สต็อกปัจจุบัน</p>
            <p className={`text-4xl font-bold mt-1 ${isLow ? "text-red-500" : "text-gray-900"}`}>
              {p.current_stock}
              <span className="text-lg font-normal text-gray-400 ml-1">{p.unit}</span>
            </p>
          </div>
          <div className="text-right">
            {isLow ? (
              <Badge variant="warning">ใกล้หมด</Badge>
            ) : (
              <Badge variant="success">ปกติ</Badge>
            )}
            <p className="text-xs text-gray-400 mt-1">ขั้นต่ำ {p.min_stock_level} {p.unit}</p>
          </div>
        </div>
      </Card>

      {/* Product Info */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">ข้อมูลสินค้า</h3>
        <div className="space-y-2 text-sm">
          {p.categories_mf?.name && (
            <div className="flex justify-between">
              <span className="text-gray-500">หมวดหมู่</span>
              <span className="font-medium">{p.categories_mf.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">หน่วย</span>
            <span className="font-medium">{p.unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ประกัน (default)</span>
            <span className="font-medium">
              {p.default_warranty_months > 0 ? `${p.default_warranty_months / 12} ปี` : "ไม่มีประกัน"}
            </span>
          </div>
          {p.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 mb-1">รายละเอียด</p>
              <p className="text-gray-700">{p.description}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/stock-in/new?product=${p.id}`} className="flex-1">
          <Card className="text-center py-4 border-brand/20 active:scale-95 transition-transform">
            <p className="text-2xl">📥</p>
            <p className="text-sm font-medium text-brand mt-1">รับเข้า</p>
          </Card>
        </Link>
        <Link href={`/stock-out/new?product=${p.id}`} className="flex-1">
          <Card className="text-center py-4 border-brand/20 active:scale-95 transition-transform">
            <p className="text-2xl">🛒</p>
            <p className="text-sm font-medium text-brand mt-1">ขายออก</p>
          </Card>
        </Link>
      </div>

      {/* History */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">ประวัติรับเข้า</h3>
        {stockIn.length === 0 ? (
          <p className="text-gray-400 text-sm">ยังไม่มีประวัติ</p>
        ) : (
          <div className="space-y-2">
            {stockIn.map((s: any) => (
              <Card key={s.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">+{s.quantity} {p.unit}</p>
                  <p className="text-xs text-gray-400">{s.supplier || "-"}</p>
                </div>
                <p className="text-xs text-gray-400">{formatDateShort(s.received_date)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">ประวัติขายออก</h3>
        {stockOut.length === 0 ? (
          <p className="text-gray-400 text-sm">ยังไม่มีประวัติ</p>
        ) : (
          <div className="space-y-2">
            {stockOut.map((s: any) => (
              <Card key={s.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">-{s.quantity} {p.unit}</p>
                  <p className="text-xs text-gray-400">{s.customer_name}</p>
                </div>
                <p className="text-xs text-gray-400">{formatDateShort(s.sold_date)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
