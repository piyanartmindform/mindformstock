import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getStockIn(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_mf")
    .select("*, products_mf(id, name, model, unit)")
    .eq("id", id)
    .single();
  return data;
}

export default async function StockInDetailPage({ params }: { params: { id: string } }) {
  const item = await getStockIn(params.id);
  if (!item) notFound();

  const rows = [
    { label: "สินค้า", value: [item.products_mf?.name, item.products_mf?.model].filter(Boolean).join(" · ") },
    { label: "จำนวนรับเข้า", value: `${item.quantity} ${item.products_mf?.unit ?? ""}` },
    { label: "วันที่รับเข้า", value: formatDate(item.received_date) },
    { label: "ซัพพลายเออร์", value: item.supplier || "-" },
    { label: "ประเทศต้นทาง", value: item.source_country || "-" },
    { label: "หมายเหตุ", value: item.notes || "-" },
    { label: "บันทึกโดย", value: item.created_by || "-" },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto w-full space-y-5">
      <div className="pt-2">
        <Link href="/stock-in" className="text-sm text-brand block mb-2">← กลับ</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">รายละเอียดรับเข้า</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formatDate(item.received_date)}</p>
          </div>
          <Link href={`/stock-in/${item.id}/edit`} className="text-sm text-brand underline mt-1">
            แก้ไข
          </Link>
        </div>
      </div>

      <Card className="divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between items-start py-3 first:pt-0 last:pb-0 gap-4">
            <span className="text-sm text-gray-500 shrink-0">{r.label}</span>
            <span className="text-sm font-medium text-gray-900 text-right">{r.value}</span>
          </div>
        ))}
      </Card>

      {item.products_mf?.id && (
        <Link href={`/products/${item.products_mf.id}`}>
          <Card className="flex items-center justify-between py-3 active:scale-95 transition-transform">
            <span className="text-sm text-gray-700">ดูข้อมูลสินค้า</span>
            <span className="text-brand text-sm">→</span>
          </Card>
        </Link>
      )}
    </div>
  );
}
