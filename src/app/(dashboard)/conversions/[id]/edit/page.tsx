import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewConversionForm, type ConversionInitial } from "../../new/NewConversionForm";

export default async function EditConversionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: conv }, { data: products }] = await Promise.all([
    supabase
      .from("conversions_mf")
      .select("id, converted_date, note, leftover_note, taken_note, conversion_items_mf(product_id, direction, quantity)")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("products_mf")
      .select("id, name, model, unit, current_stock, image_urls, categories_mf(name, sort_order)")
      .eq("is_active", true)
      .order("name"),
  ]);
  if (!conv) notFound();

  const items: any[] = (conv as any).conversion_items_mf ?? [];
  const pick = (dir: string) =>
    items.filter((i) => i.direction === dir).map((i) => ({ productId: i.product_id, qty: i.quantity }));
  const initial: ConversionInitial = {
    id: conv.id,
    converted_date: conv.converted_date,
    note: conv.note,
    leftover_note: (conv as any).leftover_note,
    taken_note: (conv as any).taken_note,
    out: pick("out"),
    in: pick("in"),
  };

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/conversions" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขใบแปลงสภาพ</h1>
        <p className="text-sm text-gray-500 mt-1">
          เมื่อบันทึก ระบบจะคืนสต็อกของใบเดิมแล้วคิดใหม่ตามรายการที่แก้
        </p>
      </div>
      <NewConversionForm products={(products ?? []) as any} initial={initial} />
    </div>
  );
}
