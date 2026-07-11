import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { getCurrentUserRole } from "@/lib/auth";
import { DeleteExpectedButton } from "./DeleteExpectedButton";

async function getExpected() {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_expected_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export default async function ExpectedStockInPage() {
  const [items, role] = await Promise.all([getExpected(), getCurrentUserRole()]);
  const open = items.filter((i: any) => i.status === "open");
  const closed = items.filter((i: any) => i.status === "closed");

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <Link href="/stock-in" className="text-sm text-brand block mb-2">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-900">รายการที่รอรับเข้า</h1>
          <p className="text-gray-500 text-sm">{open.length} รายการค้างรับ</p>
        </div>
        {role === "admin" && (
          <Link
            href="/stock-in/expected/new"
            className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            + แจ้งล่วงหน้า
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">ยังไม่มีรายการแจ้งล่วงหน้า</p>
        </div>
      ) : (
        <div className="space-y-5">
          {open.length > 0 && (
            <div className="space-y-2">
              {open.map((item: any) => {
                const pct = Math.min(100, Math.round((item.received_quantity / item.expected_quantity) * 100));
                const remaining = item.expected_quantity - item.received_quantity;
                return (
                  <div key={item.id}>
                    {role === "admin" && (
                      <div className="flex justify-end items-center gap-1 mb-1">
                        <Link href={`/stock-in/expected/${item.id}/edit`} className="text-xs text-brand underline px-1">
                          แก้ไข
                        </Link>
                        {item.received_quantity === 0 && <DeleteExpectedButton id={item.id} />}
                      </div>
                    )}
                    <Link href={`/stock-in/new?expected=${item.id}`}>
                      <Card className="py-3 active:scale-95 transition-transform">
                        <div className="flex items-center gap-3">
                          {item.products_mf?.image_urls?.[0] ? (
                            <Image src={item.products_mf.image_urls[0]} alt={item.products_mf.name} width={80} height={56} className="h-14 w-auto max-w-20 rounded-lg object-contain shrink-0 bg-gray-50" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xl">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {item.products_mf?.name ?? "-"}
                                {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                              </p>
                              <span className="text-xs font-semibold text-brand shrink-0">
                                {item.received_quantity}/{item.expected_quantity}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              เหลืออีก {remaining} {item.products_mf?.unit} · แจ้งเมื่อ {formatDate(item.created_at)}
                            </p>
                            {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {closed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">ปิดรายการแล้ว</h2>
              <div className="space-y-2">
                {closed.map((item: any) => (
                  <Card key={item.id} className="py-3 opacity-70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {item.products_mf?.name ?? "-"}
                          {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          รับแล้ว {item.received_quantity}/{item.expected_quantity} {item.products_mf?.unit}
                          {item.closed_at && ` · ปิดเมื่อ ${formatDate(item.closed_at)}`}
                        </p>
                      </div>
                      <Badge variant={item.received_quantity >= item.expected_quantity ? "success" : "warning"}>
                        {item.received_quantity >= item.expected_quantity ? "ครบ" : "บางส่วน"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
