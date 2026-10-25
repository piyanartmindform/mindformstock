import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default async function ConversionsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversions_mf")
    .select("id, converted_date, note, leftover_note, taken_note, conversion_items_mf(direction, quantity, products_mf(name, model, unit))")
    .order("converted_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const conversions = data ?? [];

  const line = (i: any) =>
    `${i.products_mf?.name ?? "-"}${i.products_mf?.model ? ` · ${i.products_mf.model}` : ""} × ${i.quantity} ${i.products_mf?.unit ?? ""}`;

  return (
    <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ใบแปลงสภาพ</h1>
          <p className="text-gray-500 text-sm">{conversions.length} ใบ</p>
        </div>
        <Link
          href="/conversions/new"
          className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center"
        >
          + ใบใหม่
        </Link>
      </div>

      {conversions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔧</p>
          <p className="text-gray-500">ยังไม่มีใบแปลงสภาพ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversions.map((c: any) => {
            const items: any[] = c.conversion_items_mf ?? [];
            return (
              <Card key={c.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{formatDate(c.converted_date)}</p>
                  <div className="flex items-center gap-3 min-w-0">
                    {c.note && <p className="text-xs text-gray-500 truncate">{c.note}</p>}
                    <Link href={`/conversions/${c.id}/edit`} className="text-sm text-brand font-medium shrink-0 py-1">
                      แก้ไข
                    </Link>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  {items.filter((i) => i.direction === "out").map((i, n) => (
                    <p key={`o${n}`} className="text-red-700">− {line(i)}</p>
                  ))}
                  {items.filter((i) => i.direction === "in").map((i, n) => (
                    <p key={`i${n}`} className="text-green-700">+ {line(i)}</p>
                  ))}
                </div>
                {c.leftover_note && (
                  <div className="text-sm rounded-lg bg-green-50 px-3 py-2">
                    <p className="text-xs font-medium text-green-800">ชิ้นส่วนที่เหลือ</p>
                    <ul className="text-gray-800 list-disc pl-5">{c.leftover_note.split("\n").map((t: string, n: number) => <li key={n}>{t}</li>)}</ul>
                  </div>
                )}
                {c.taken_note && (
                  <div className="text-sm rounded-lg bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">ชิ้นส่วนที่เอาไป (ต้องสั่งทดแทน)</p>
                    <ul className="text-gray-800 list-disc pl-5">{c.taken_note.split("\n").map((t: string, n: number) => <li key={n}>{t}</li>)}</ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
