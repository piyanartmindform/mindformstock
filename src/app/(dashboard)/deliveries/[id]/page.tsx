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
import { AddCustomItem, ItemEditor } from "./ItemEditor";
import { AddStockItem, type AvailableItem } from "./AddStockItem";
import { ITEM_SELECT, applyItemOrder, getCustomerLines, getItemOrder, getItemPhotoUrls, isCustom, itemName, itemUnit, productImage } from "@/lib/deliveryItems";
import { CustomerItemsEditor } from "./CustomerItemsEditor";

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
  // manual order of the lines (up / down buttons); everything below reads the sorted array
  delivery.delivery_items_mf = applyItemOrder(delivery.delivery_items_mf ?? [], await getItemOrder(supabase, delivery.id));
  const orderedItemIds: string[] = delivery.delivery_items_mf.map((i: any) => i.id);

  const status = delivery.status as DeliveryStatus;
  const itemPhotoUrls = await getItemPhotoUrls(supabase, delivery.delivery_items_mf ?? []);
  const customer = await getCustomerLines(supabase, delivery.id);
  const customerLabelById = new Map(customer.lines.map((l) => [l.id, l.label]));
  const linksByItem = new Map<string, { customerItemId: string; quantity: number }[]>();
  for (const l of customer.links) {
    linksByItem.set(l.deliveryItemId, [...(linksByItem.get(l.deliveryItemId) ?? []), { customerItemId: l.customerItemId, quantity: l.quantity }]);
  }

  // lines can be edited until the customer has signed (delivered / billed are locked)
  const canEditItems = role === "admin" && ["confirmed", "prepared", "scheduled"].includes(status);
  const expectedIds: string[] = (delivery.delivery_items_mf ?? []).flatMap((i: any) => (i.expected_id ? [i.expected_id] : []));
  const plannedElsewhere = new Map<string, number>();
  if (canEditItems && expectedIds.length > 0) {
    const { data: others } = await supabase
      .from("delivery_items_mf")
      .select("expected_id, quantity")
      .in("expected_id", expectedIds)
      .neq("delivery_id", delivery.id);
    for (const r of others ?? []) plannedElsewhere.set(r.expected_id, (plannedElsewhere.get(r.expected_id) ?? 0) + r.quantity);
  }

  // stock items of the same customer/project that can still be added to this round
  let availableToAdd: AvailableItem[] = [];
  if (canEditItems) {
    let q = supabase
      .from("stock_out_expected_mf")
      .select("id, product_id, expected_quantity, status, project_name, products_mf(name, model, unit)")
      .eq("customer_name", delivery.customer_name)
      .order("created_at", { ascending: true });
    const { data: candidates } = await q;
    const inThisRound = new Set(expectedIds);
    const candidateIds = (candidates ?? []).map((c: any) => c.id).filter((id: string) => !inThisRound.has(id));
    const plannedAll = new Map<string, number>();
    if (candidateIds.length > 0) {
      const { data: plannedRows } = await supabase
        .from("delivery_items_mf")
        .select("expected_id, quantity")
        .in("expected_id", candidateIds);
      for (const r of plannedRows ?? []) plannedAll.set(r.expected_id, (plannedAll.get(r.expected_id) ?? 0) + r.quantity);
    }
    availableToAdd = (candidates ?? [])
      .filter((c: any) => !inThisRound.has(c.id))
      .map((c: any) => ({
        expectedId: c.id,
        productId: c.product_id,
        name: c.products_mf?.name ?? "-",
        model: c.products_mf?.model ?? null,
        unit: c.products_mf?.unit ?? "",
        project: c.project_name ?? null,
        max: c.expected_quantity - (plannedAll.get(c.id) ?? 0),
        closed: c.status === "closed",
      }))
      .filter((a: AvailableItem) => a.max > 0)
      .sort((a: AvailableItem, b: AvailableItem) => Number(a.closed) - Number(b.closed));
  }
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
            <div className="flex items-start gap-3">
              {productImage(i) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productImage(i)!} alt={itemName(i)} className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />
              )}
              <span className="flex-1 min-w-0 text-gray-900">
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
            {(linksByItem.get(i.id) ?? []).length > 0 && (
              <p className="text-xs text-sky-800 mt-0.5">
                ในใบลูกค้า:{" "}
                {(linksByItem.get(i.id) ?? [])
                  .map((a) => `${customerLabelById.get(a.customerItemId)} (${a.quantity})`)
                  .join(", ")}
              </p>
            )}
            <ItemPhotos
              deliveryId={delivery.id}
              itemId={i.id}
              photos={(i.image_paths ?? []).flatMap((path: string) => {
                const url = itemPhotoUrls.get(path);
                return url ? [{ path, url }] : [];
              })}
              canEdit={role === "admin"}
            />
            {canEditItems && (
              <ItemEditor
                orderedIds={orderedItemIds}
                item={{
                  id: i.id,
                  quantity: i.quantity,
                  isCustom: isCustom(i),
                  name: itemName(i),
                  unit: itemUnit(i),
                  customSource: i.custom_source ?? "",
                  note: i.item_note ?? "",
                  maxQty: i.expected_id
                    ? (i.stock_out_expected_mf?.expected_quantity ?? i.quantity) - (plannedElsewhere.get(i.expected_id) ?? 0)
                    : null,
                }}
              />
            )}
          </div>
        ))}
        {canEditItems && <AddStockItem deliveryId={delivery.id} available={availableToAdd} />}
        {canEditItems && <AddCustomItem deliveryId={delivery.id} />}
      </Card>

      {customer.ready && (canEditItems || customer.lines.length > 0) && (
        <Card>
          <CustomerItemsEditor
            deliveryId={delivery.id}
            canEdit={canEditItems}
            linksReady={customer.linksReady}
            lines={(delivery.delivery_items_mf ?? []).map((i: any) => ({
              id: i.id,
              name: `${itemName(i)}${i.products_mf?.model ? ` · ${i.products_mf.model}` : ""}`,
              quantity: i.quantity,
              unit: itemUnit(i),
              allocations: linksByItem.get(i.id) ?? [],
            }))}
            items={customer.lines.map((l) => ({
              ...l,
              assigned: customer.links
                .filter((x) => x.customerItemId === l.id)
                .map((x) => {
                  const item = (delivery.delivery_items_mf ?? []).find((i: any) => i.id === x.deliveryItemId);
                  return item ? `${itemName(item)} ×${x.quantity}` : "";
                })
                .filter(Boolean),
            }))}
          />
        </Card>
      )}

      <Card className="space-y-1 text-sm">
        <p><span className="text-gray-500">โปรเจค:</span> {delivery.project_name || "-"}</p>
        {delivery.po_number && <p><span className="text-gray-500">เลขที่ PO อ้างอิง:</span> {delivery.po_number}</p>}
        <p><span className="text-gray-500">วันนัดส่ง:</span> {delivery.scheduled_date ? formatDate(delivery.scheduled_date) : "-"}</p>
        <p><span className="text-gray-500">ที่อยู่ส่ง:</span> {delivery.delivery_address || "-"}</p>
        <p><span className="text-gray-500">ผู้รับหน้างาน:</span> {delivery.receiver_name || "-"}</p>
        <p><span className="text-gray-500">เบอร์ติดต่อผู้รับ:</span> {delivery.receiver_phone || "-"}</p>
        {delivery.note && <p><span className="text-gray-500">หมายเหตุ:</span> {delivery.note}</p>}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {[
          { doc: "prep", name: "ใบเตรียมของ" },
          { doc: "note", name: "ใบส่งงาน" },
        ].map((d) => (
          <Link
            key={d.doc}
            href={`/deliveries/${delivery.id}/print?doc=${d.doc}&preview=1`}
            className="rounded-xl border border-brand bg-brand/5 px-3 py-2.5 text-center active:bg-brand/10"
          >
            <span className="block text-sm font-semibold text-gray-900">{d.name}</span>
            <span className="block text-xs font-medium text-brand-700">📄 ตัวอย่าง / ดาวน์โหลด PDF</span>
          </Link>
        ))}
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
            receiver_phone: delivery.receiver_phone ?? "",
            po_number: delivery.po_number ?? "",
            project_name: delivery.project_name ?? "",
            note: delivery.note ?? "",
          }}
        />
      )}
    </div>
  );
}
