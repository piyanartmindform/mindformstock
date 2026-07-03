import { createClient } from "@/lib/supabase/server";
import { GenerateQRForm } from "./GenerateQRForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getNextNumber() {
  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("qr_number")
    .order("qr_number", { ascending: false })
    .limit(1);
  return (data?.[0]?.qr_number ?? 0) + 1;
}

export default async function GenerateQRPage() {
  const nextNumber = await getNextNumber();
  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/warranty" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">สร้าง QR Batch</h1>
        <p className="text-sm text-gray-500 mt-1">สร้างรหัส QR สำหรับสติ๊กเกอร์ประกันสินค้า</p>
      </div>
      <GenerateQRForm nextNumber={nextNumber} />
    </div>
  );
}
