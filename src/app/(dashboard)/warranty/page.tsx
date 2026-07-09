import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { WarrantyList } from "./WarrantyList";

async function getQRCodes() {
  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("*, products_mf(name, model)")
    .eq("status", "registered")
    .order("registered_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export default async function WarrantyPage() {
  const items = await getQRCodes();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ประกันสินค้า</h1>
          <p className="text-gray-500 text-sm">{items.length} รายการที่ลงทะเบียนแล้ว</p>
        </div>
      </div>

      {/* Action buttons */}
      <Link
        href="/warranty/register"
        className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-brand text-white font-medium text-sm"
      >
        <span>✍️</span> ลงทะเบียนประกัน
      </Link>

      <WarrantyList items={items} />
    </div>
  );
}
