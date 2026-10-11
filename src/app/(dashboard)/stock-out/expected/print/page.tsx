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
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur flex items-center justify-between">
        <Link href="/stock-out/expected" className="text-sm font-medium text-brand">← กลับ</Link>
        <PrintButton label="🖨️ พิมพ์ใบงาน" />
      </div>

      <div className="mx-auto min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg print:m-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <DocumentHeader title="ใบงานเตรียมสินค้าส่งออก" issuedAt={new Date().toISOString()} />

        <div className="relative mb-6 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">ลูกค้า</p>
              <p className="text-base font-bold leading-snug text-slate-900">{customer}</p>
              {customerInfo?.address && <p className="text-slate-600">{customerInfo.address}</p>}
              {customerInfo?.tax_id && <p className="text-xs text-slate-600">เลขประจำตัวผู้เสียภาษี {customerInfo.tax_id}</p>}
              {(customerInfo?.contact_person || customerInfo?.phone) && (
                <p className="text-xs text-slate-600">
                  ผู้ติดต่อ {[customerInfo.contact_person, customerInfo.phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="sm:min-w-40 sm:border-l sm:border-brand-200 sm:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">โปรเจค</p>
              <p className="mt-1 font-semibold text-slate-900">{project ?? "-"}</p>
            </div>
          </div>
        </div>

        <table className="mb-8 w-full text-[13px]">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                <tr key={item.id} className="border-b border-slate-100 align-top">
                  <td className="py-2.5 pr-2">
                    <span className="inline-block h-4 w-4 rounded border border-slate-400" />
                  </td>
                  <td className="py-2.5 pr-2">
                    {item.products_mf?.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.products_mf.image_urls[0]} alt={item.products_mf.name} className="h-16 w-16 rounded-lg border border-slate-100 bg-slate-50 object-contain" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700">MF</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-2 font-medium text-slate-900">
                    {item.products_mf?.name ?? "-"}
                    {item.products_mf?.model && <p className="mt-1 text-xs font-normal text-slate-500">รุ่น {item.products_mf.model}</p>}
                  </td>
                  <td className="py-2.5 pr-2 text-right font-medium whitespace-nowrap">
                    {remaining} {item.products_mf?.unit ?? ""}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-500">{item.note ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mb-8 mt-5">
          <p className="mb-2 text-xs text-slate-500">หมายเหตุเพิ่มเติม</p>
          <div className="h-9 border-b border-slate-300" />
          <div className="h-9 border-b border-slate-300" />
          <div className="h-9 border-b border-slate-300" />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 break-inside-avoid text-xs sm:gap-8">
          <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label="ผู้จัดของ" /></div>
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4"><SignatureBlock label="ผู้ตรวจสอบ" /></div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-500">พิมพ์เมื่อ {formatDate(new Date().toISOString())} โดย {printerName ?? "-"}</p>
          <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-brand-700">MINDFORM · BUILT FOR BETTER WORK</p>
        </div>
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
