import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { DELIVERY_STATUSES, STATUS_BADGE, STATUS_LABEL, type DeliveryStatus } from "@/lib/deliveries";
import { StatusFilter } from "./StatusFilter";

export default async function DeliveriesPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = DELIVERY_STATUSES.includes(searchParams.status as DeliveryStatus) ? searchParams.status : "";
  const supabase = createClient();
  let query = supabase
    .from("deliveries_mf")
    .select("id, doc_no, customer_name, project_name, scheduled_date, status, delivery_items_mf(quantity)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const deliveries = data ?? [];

  return (
    <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">รอบส่ง / ใบส่งงาน</h1>
        <p className="text-gray-500 text-sm">{deliveries.length} รอบ</p>
      </div>

      <StatusFilter value={status ?? ""} />

      {deliveries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🚚</p>
          <p className="text-gray-500">ยังไม่มีรอบส่ง</p>
          <p className="text-gray-500 text-sm mt-1">สร้างได้จากหน้ารายการที่รอส่งออก</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d: any) => {
            const totalQty = (d.delivery_items_mf ?? []).reduce((n: number, i: any) => n + i.quantity, 0);
            return (
              <Link key={d.id} href={`/deliveries/${d.id}`} className="block">
                <Card className="py-3 active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-mono text-gray-500">{d.doc_no}</p>
                    <Badge variant={STATUS_BADGE[d.status as DeliveryStatus]}>{STATUS_LABEL[d.status as DeliveryStatus]}</Badge>
                  </div>
                  <p className="font-medium text-gray-900 mt-1">
                    {d.customer_name}{d.project_name ? ` · ${d.project_name}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(d.delivery_items_mf ?? []).length} รายการ · {totalQty} ชิ้น
                    {d.scheduled_date ? ` · นัดส่ง ${formatDate(d.scheduled_date)}` : " · ยังไม่ระบุวันนัด"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
