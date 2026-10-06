import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  DELIVERY_STATUSES,
  STATUS_BADGE,
  STATUS_DATE_COLUMN,
  STATUS_LABEL,
  type DeliveryStatus,
} from "@/lib/deliveries";
import { DeliveryActions } from "./DeliveryActions";
import { ItemPhotos } from "./ItemPhotos";
import { ITEM_SELECT, getItemPhotoUrls, isCustom, itemName, itemUnit } from "@/lib/deliveryItems";

export default async function DeliveryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [role, { data: delivery }] = await Promise.all([
    getCurrentUserRole(),
    supabase
      .from("deliveries_mf")
      .select(`*, delivery_items_mf(${ITEM_SELECT})`)
      .eq("id", params.id)
      .single(),
  ]);
  if (!delivery) notFound();

  const status = delivery.status as DeliveryStatus;
  const itemPhotoUrls = await getItemPhotoUrls(supabase, delivery.delivery_items_mf ?? []);
  const paths: string[] = delivery.signed_doc_paths ?? [];
  const signed = paths.length
    ? (await supabase.storage.from("delivery-docs").createSignedUrls(paths, 3600)).data ?? []
    : [];
  const photos = signed.flatMap((s) => (s.signedUrl && s.path ? [{ path: s.path, url: s.signedUrl }] : []));

  return (
    <div className="p-4 max-w-2xl mx-auto w-full space-y-4 pb-8">
      <div className="pt-2">
        <Link href="/deliveries" className="text-sm text-brand block mb-2">← กลับ</Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-mono text-gray-500">{delivery.doc_no}</p>
            <h1 className="text-xl font-bold text-gray-900">
              {delivery.customer_name}{delivery.project_name ? ` · ${delivery.project_name}` : ""}
            </h1>
          </div>
          <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
      </div>

      <Card>
        <ol className="space-y-2">
          {DELIVERY_STATUSES.map((s) => {
            const col = STATUS_DATE_COLUMN[s];
            const reached = DELIVERY_STATUSES.indexOf(s) <= DELIVERY_STATUSES.indexOf(status);
            const at = col ? delivery[col] : delivery.created_at;
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    reached ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {reached ? "✓" : ""}
                </span>
                <span className={reached ? "font-medium text-gray-900" : "text-gray-500"}>{STATUS_LABEL[s]}</span>
                {reached && at && <span className="ml-auto text-xs text-gray-500">{formatDate(at)}</span>}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="space-y-2 text-sm">
        <p className="font-medium text-gray-900">รายการสินค้า</p>
        {(delivery.delivery_items_mf ?? []).map((i: any) => (
          <div key={i.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-900">
                {itemName(i)}
                {i.products_mf?.model && <span className="text-gray-500"> · {i.products_mf.model}</span>}
                {isCustom(i) && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">สั่งทำ</span>
                )}
              </span>
              <span className="font-medium whitespace-nowrap">{i.quantity} {itemUnit(i)}</span>
            </div>
            {i.custom_source && <p className="text-xs text-gray-500 mt-0.5">ผู้ผลิต/แหล่งที่มา: {i.custom_source}</p>}
            {i.item_note && <p className="text-xs text-gray-600 mt-0.5">{i.item_note}</p>}
            <ItemPhotos
              deliveryId={delivery.id}
              itemId={i.id}
              photos={(i.image_paths ?? []).flatMap((path: string) => {
                const url = itemPhotoUrls.get(path);
                return url ? [{ path, url }] : [];
              })}
              canEdit={role === "admin"}
            />
          </div>
        ))}
      </Card>

      <Card className="space-y-1 text-sm">
        <p><span className="text-gray-500">วันนัดส่ง:</span> {delivery.scheduled_date ? formatDate(delivery.scheduled_date) : "-"}</p>
        <p><span className="text-gray-500">ที่อยู่ส่ง:</span> {delivery.delivery_address || "-"}</p>
        <p><span className="text-gray-500">ผู้รับหน้างาน:</span> {delivery.receiver_name || "-"}</p>
        {delivery.note && <p><span className="text-gray-500">หมายเหตุ:</span> {delivery.note}</p>}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/deliveries/${delivery.id}/print?doc=prep`}
          className="h-12 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium flex items-center justify-center active:bg-gray-100"
        >
          🖨️ ใบเตรียมของ
        </Link>
        <Link
          href={`/deliveries/${delivery.id}/print?doc=note`}
          className="h-12 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium flex items-center justify-center active:bg-gray-100"
        >
          🖨️ ใบส่งงาน
        </Link>
      </div>

      {photos.length > 0 && (
        <Card className="space-y-2">
          <p className="font-medium text-gray-900 text-sm">ใบส่งงานที่ลูกค้าเซ็นแล้ว</p>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p) => (
              <a key={p.path} href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="ใบส่งงานที่เซ็นแล้ว" className="w-full rounded-lg border border-gray-200" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {role === "admin" && (
        <DeliveryActions
          id={delivery.id}
          status={status}
          photoCount={paths.length}
          initial={{
            scheduled_date: delivery.scheduled_date ?? "",
            delivery_address: delivery.delivery_address ?? "",
            receiver_name: delivery.receiver_name ?? "",
            note: delivery.note ?? "",
          }}
        />
      )}
    </div>
  );
}
