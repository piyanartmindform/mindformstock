import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, isWarrantyActive } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";

async function getQRCode(code: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("*, products_mf(name, model, brand, description, image_urls)")
    .eq("code", code.toUpperCase())
    .single();
  return data;
}

export default async function PublicWarrantyPage({ params }: { params: { id: string } }) {
  const item = await getQRCode(params.id);
  if (!item) notFound();

  // QR exists but not yet registered (unused, or scanned out as a stock-tracking code only)
  if (item.status === "unused" || item.status === "sold") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-brand px-6 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">M</div>
            <span className="text-white font-semibold text-lg">MINDFORM</span>
          </div>
          <p className="text-white/70 text-sm">ข้อมูลการรับประกันสินค้า</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-4xl mb-4">🔲</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ยังไม่ได้ลงทะเบียน</h2>
          <p className="text-gray-500 text-sm">รหัส {item.code}</p>
          <p className="text-gray-400 text-sm mt-2">สินค้านี้ยังไม่ได้ลงทะเบียนประกันในระบบ</p>
        </div>
      </div>
    );
  }

  const active = item.warranty_expires_at ? isWarrantyActive(item.warranty_expires_at) : false;
  const hasWarranty = !!item.warranty_expires_at;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">M</div>
          <span className="text-white font-semibold text-lg">MINDFORM</span>
        </div>
        <p className="text-white/70 text-sm">ข้อมูลการรับประกันสินค้า</p>
      </div>

      {/* Warranty Status Banner */}
      {hasWarranty && (
        <div className={`px-6 py-5 flex items-center gap-4 ${active ? "bg-green-500" : "bg-red-500"}`}>
          <div className="text-4xl">{active ? "✅" : "❌"}</div>
          <div>
            <p className="text-white font-bold text-xl">
              {active ? "อยู่ในประกัน" : "หมดประกันแล้ว"}
            </p>
            <p className="text-white/80 text-sm">
              {active
                ? `ประกันถึงวันที่ ${formatDate(item.warranty_expires_at)}`
                : `หมดประกันตั้งแต่ ${formatDate(item.warranty_expires_at)}`}
            </p>
          </div>
        </div>
      )}

      {!hasWarranty && item.status === "registered" && (
        <div className="px-6 py-5 flex items-center gap-4 bg-gray-400">
          <div className="text-4xl">ℹ️</div>
          <div>
            <p className="text-white font-bold text-xl">สินค้านี้ไม่มีประกัน</p>
          </div>
        </div>
      )}

      {/* Product & Purchase Info */}
      <div className="flex-1 p-6 space-y-4">
        {item.products_mf && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <ProductImage images={item.products_mf.image_urls || []} alt={item.products_mf.name} />
            <h2 className="text-lg font-bold text-gray-900">{item.products_mf.name}</h2>
            {item.products_mf.model && (
              <p className="text-gray-500 text-sm mt-0.5">รุ่น {item.products_mf.model}</p>
            )}
            {item.products_mf.brand && (
              <p className="text-gray-400 text-sm">{item.products_mf.brand}</p>
            )}
            {item.products_mf.description && (
              <p className="text-gray-600 text-sm mt-3 border-t border-gray-100 pt-3">
                {item.products_mf.description}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold text-gray-900">ข้อมูลการซื้อ</h3>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">รหัส QR</span>
            <span className="font-mono font-medium text-gray-900">{item.code}</span>
          </div>

          {item.customer_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ลูกค้า</span>
              <span className="font-medium text-gray-900">{item.customer_name}</span>
            </div>
          )}

          {item.project_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">โปรเจค</span>
              <span className="font-medium text-gray-900">{item.project_name}</span>
            </div>
          )}

          {item.purchase_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">วันที่ซื้อ</span>
              <span className="font-medium text-gray-900">{formatDate(item.purchase_date)}</span>
            </div>
          )}

          {hasWarranty && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ประกันถึง</span>
              <span className={`font-medium ${active ? "text-green-600" : "text-red-500"}`}>
                {formatDate(item.warranty_expires_at)}
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">
          MINDFORM Stock & Warranty System
        </p>
      </div>
    </div>
  );
}
