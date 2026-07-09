import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
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
  const [items, role] = await Promise.all([getQRCodes(), getCurrentUserRole()]);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ประกันสินค้า</h1>
          <p className="text-gray-500 text-sm">{items.length} รายการที่ลงทะเบียนแล้ว</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`grid gap-3 ${role === "admin" ? "grid-cols-2" : "grid-cols-1"}`}>
        <Link
          href="/warranty/register"
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-brand text-white font-medium text-sm"
        >
          <span>✍️</span> ลงทะเบียนประกัน
        </Link>
        {role === "admin" && (
          <Link
            href="/warranty/generate"
            className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-gray-900 text-white font-medium text-sm"
          >
            <span>🏷️</span> สร้าง QR Batch
          </Link>
        )}
      </div>

      <WarrantyList items={items} />
    </div>
  );
}
