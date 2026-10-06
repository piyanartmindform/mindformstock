import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { PrintButton } from "@/components/ui/PrintButton";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { ITEM_SELECT, getItemPhotoUrls, isCustom, itemName, itemUnit } from "@/lib/deliveryItems";

async function getPrinterName() {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name ?? null;
}

export default async function PrintDeliveryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string };
}) {
  const isNote = searchParams.doc === "note";
  const supabase = createClient();
  const [{ data: delivery }, printerName] = await Promise.all([
    supabase
      .from("deliveries_mf")
      .select(`*, delivery_items_mf(${ITEM_SELECT})`)
      .eq("id", params.id)
      .single(),
    getPrinterName(),
  ]);
  if (!delivery) notFound();

  const { data: customer } = await supabase
    .from("customers_mf")
    .select("contact_person, phone, address, tax_id")
    .eq("name", delivery.customer_name)
    .maybeSingle();

  const items: any[] = delivery.delivery_items_mf ?? [];
  const totalQty = items.reduce((n, i) => n + i.quantity, 0);
  const photoUrls = await getItemPhotoUrls(supabase, items);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <Link href={`/deliveries/${delivery.id}`} className="text-sm text-brand">← กลับ</Link>
        <PrintButton label={isNote ? "🖨️ พิมพ์ใบส่งงาน" : "🖨️ พิมพ์ใบเตรียมของ"} />
      </div>

      <div className="max-w-2xl mx-auto p-6 print:p-0 bg-white print:bg-white">
        <DocumentHeader
          title={isNote ? "ใบส่งงาน" : "ใบเตรียมของ"}
          docNo={delivery.doc_no}
          issuedAt={new Date().toISOString()}
        />

        <div className="border border-gray-300 rounded-lg p-4 text-sm mb-4 space-y-1">
          <p className="text-gray-500 text-xs">ลูกค้า</p>
          <p className="text-gray-900 font-bold">{delivery.customer_name}</p>
          {customer?.address && <p className="text-gray-700">{customer.address}</p>}
          {customer?.tax_id && <p className="text-gray-700">เลขประจำตัวผู้เสียภาษี {customer.tax_id}</p>}
          {(customer?.contact_person || customer?.phone) && (
            <p className="text-gray-700">ผู้ติดต่อ {[customer.contact_person, customer.phone].filter(Boolean).join(" · ")}</p>
          )}
          <p className="text-gray-700 pt-1">
            โปรเจค: <span className="font-medium text-gray-900">{delivery.project_name ?? "-"}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500 text-xs">วันนัดส่ง/ติดตั้ง</p>
            <p className="text-gray-900 font-medium">{delivery.scheduled_date ? formatDate(delivery.scheduled_date) : "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">ผู้รับหน้างาน</p>
            <p className="text-gray-900 font-medium">{delivery.receiver_name || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-xs">สถานที่ส่ง</p>
            <p className="text-gray-900 font-medium">{delivery.delivery_address || customer?.address || "-"}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-300">
              {!isNote && <th className="py-2 pr-2 font-medium w-8">✓</th>}
              <th className="py-2 pr-2 font-medium w-8">#</th>
              <th className="py-2 pr-2 font-medium">รายการสินค้า</th>
              <th className="py-2 text-right font-medium">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id} className="border-b border-gray-200 align-top">
                {!isNote && (
                  <td className="py-2.5 pr-2">
                    <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded" />
                  </td>
                )}
                <td className="py-2.5 pr-2 text-gray-500">{idx + 1}</td>
                <td className="py-2.5 pr-2 text-gray-900">
                  {itemName(i)}
                  {i.products_mf?.model && <span className="text-gray-500"> · {i.products_mf.model}</span>}
                  {isCustom(i) && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 align-middle">สั่งทำ</span>
                  )}
                  {i.custom_source && <p className="text-xs text-gray-500">แหล่งที่มา: {i.custom_source}</p>}
                  {i.item_note && <p className="text-xs text-gray-600">{i.item_note}</p>}
                  {(i.image_paths ?? []).length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {(i.image_paths as string[]).map((path) =>
                        photoUrls.get(path) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={path} src={photoUrls.get(path)} alt="รูปรายการ" className="w-20 h-20 rounded-md object-cover border border-gray-200" />
                        ) : null
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2.5 text-right font-medium whitespace-nowrap">
                  {i.quantity} {itemUnit(i)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={isNote ? 2 : 3} className="py-2 text-right text-gray-500">รวม</td>
              <td className="py-2 text-right font-bold text-gray-900 whitespace-nowrap">{totalQty} ชิ้น</td>
            </tr>
          </tfoot>
        </table>

        {delivery.note && (
          <p className="text-sm text-gray-700 mb-4">
            <span className="text-gray-500">หมายเหตุ:</span> {delivery.note}
          </p>
        )}

        {isNote && (
          <p className="text-sm text-gray-700 mb-2">
            ข้าพเจ้าได้ตรวจรับสินค้าตามรายการข้างต้นครบถ้วนในสภาพเรียบร้อยแล้ว
          </p>
        )}

        <div className="mb-8 mt-6">
          <p className="text-xs text-gray-500 mb-2">หมายเหตุเพิ่มเติม</p>
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mt-12 break-inside-avoid">
          {isNote ? (
            <>
              <SignatureBlock label="ผู้ส่งสินค้า" />
              <SignatureBlock label="ผู้รับสินค้า (ลูกค้า)" />
            </>
          ) : (
            <>
              <SignatureBlock label="ผู้จัดของ" />
              <SignatureBlock label="ผู้ตรวจสอบ" />
            </>
          )}
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-10">
          พิมพ์เมื่อ {formatDate(new Date().toISOString())} โดย {printerName ?? "-"}
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A4 portrait; margin: 15mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
