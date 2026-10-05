import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { PrintButton } from "@/components/ui/PrintButton";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { SignatureBlock } from "@/components/ui/SignatureBlock";

async function getGroupItems(customer: string, project: string | null) {
  const supabase = createClient();
  let query = supabase
    .from("stock_out_expected_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .eq("customer_name", customer)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  query = project ? query.eq("project_name", project) : query.is("project_name", null);
  const { data } = await query;
  return data ?? [];
}

async function getCustomer(name: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers_mf")
    .select("contact_person, phone, address, tax_id")
    .eq("name", name)
    .maybeSingle();
  return data;
}

async function getPrinterName() {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name ?? null;
}

export default async function PrintExpectedOutPage({
  searchParams,
}: {
  searchParams: { customer?: string; project?: string };
}) {
  const customer = searchParams.customer;
  if (!customer) notFound();
  const project = searchParams.project || null;
  const [items, printerName, customerInfo] = await Promise.all([
    getGroupItems(customer, project),
    getPrinterName(),
    getCustomer(customer),
  ]);
  if (items.length === 0) notFound();

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <Link href="/stock-out/expected" className="text-sm text-brand">← กลับ</Link>
        <PrintButton label="🖨️ พิมพ์ใบงาน" />
      </div>

      <div className="max-w-2xl mx-auto p-6 print:p-0 bg-white print:bg-white">
        <DocumentHeader title="ใบงานเตรียมสินค้าส่งออก" issuedAt={new Date().toISOString()} />

        <div className="border border-gray-300 rounded-lg p-4 text-sm mb-6 space-y-1">
          <p className="text-gray-500 text-xs">ลูกค้า</p>
          <p className="text-gray-900 font-bold">{customer}</p>
          {customerInfo?.address && <p className="text-gray-700">{customerInfo.address}</p>}
          {customerInfo?.tax_id && <p className="text-gray-700">เลขประจำตัวผู้เสียภาษี {customerInfo.tax_id}</p>}
          {(customerInfo?.contact_person || customerInfo?.phone) && (
            <p className="text-gray-700">
              ผู้ติดต่อ {[customerInfo.contact_person, customerInfo.phone].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-gray-700 pt-1">โปรเจค: <span className="font-medium text-gray-900">{project ?? "-"}</span></p>
        </div>

        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-300">
              <th className="py-2 pr-2 font-medium w-8">✓</th>
              <th className="py-2 pr-2 font-medium w-11"></th>
              <th className="py-2 pr-2 font-medium">สินค้า</th>
              <th className="py-2 pr-2 text-right font-medium">จำนวน</th>
              <th className="py-2 pr-2 font-medium">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const remaining = item.expected_quantity - item.sold_quantity;
              return (
                <tr key={item.id} className="border-b border-gray-200 align-top">
                  <td className="py-2.5 pr-2">
                    <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded" />
                  </td>
                  <td className="py-2.5 pr-2">
                    {item.products_mf?.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.products_mf.image_urls[0]} alt={item.products_mf.name} className="w-9 h-9 rounded-md object-contain bg-gray-50 border border-gray-100" />
                    ) : (
                      <div className="w-9 h-9 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-sm">📦</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-2 text-gray-900">
                    {item.products_mf?.name ?? "-"}
                    {item.products_mf?.model && <span className="text-gray-400"> · {item.products_mf.model}</span>}
                  </td>
                  <td className="py-2.5 pr-2 text-right font-medium whitespace-nowrap">
                    {remaining} {item.products_mf?.unit ?? ""}
                  </td>
                  <td className="py-2.5 pr-2 text-gray-500">{item.note ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mb-12">
          <p className="text-xs text-gray-500 mb-2">หมายเหตุเพิ่มเติม</p>
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mt-12 break-inside-avoid">
          <SignatureBlock label="ผู้จัดของ" />
          <SignatureBlock label="ผู้ตรวจสอบ" />
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-10">
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
