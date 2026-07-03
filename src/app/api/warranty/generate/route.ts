import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prefix, startNumber, quantity, batchId } = await req.json();

  if (!prefix || !startNumber || !quantity || !batchId) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (quantity > 500) {
    return NextResponse.json({ error: "สร้างได้สูงสุด 500 ดวงต่อครั้ง" }, { status: 400 });
  }

  const supabase = createClient();

  const rows = Array.from({ length: quantity }, (_, i) => ({
    code: `${prefix}-${String(startNumber + i).padStart(5, "0")}`,
    qr_number: startNumber + i,
    prefix,
    batch_id: batchId,
  }));

  const { error } = await supabase.from("qr_codes_mf").insert(rows);
  if (error) {
    if (error.code === "23505") {
      // Find next available number for this prefix
      const { data: last } = await supabase
        .from("qr_codes_mf")
        .select("qr_number")
        .eq("prefix", prefix)
        .order("qr_number", { ascending: false })
        .limit(1);
      const nextAvailable = (last?.[0]?.qr_number ?? 0) + 1;
      return NextResponse.json(
        { error: `รหัสซ้ำกับที่มีอยู่แล้ว — เริ่มจากเลข ${nextAvailable} แทน`, nextAvailable },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
