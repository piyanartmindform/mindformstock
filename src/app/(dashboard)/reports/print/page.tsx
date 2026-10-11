import Link from "next/link";
import { formatDate, formatDateShort, formatDateRange, groupStockInByProduct, groupWarrantyByCustomerProduct } from "@/lib/utils";
import { getReportData } from "@/lib/queries/reports";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { docText } from "@/lib/docI18n";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// shared look of the report tables (same as the work-order tables)
const theadClass = "bg-slate-50";
const trHeadClass = "border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const rowClass = "border-b border-slate-100 align-top last:border-b-0";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const from = searchParams.from || todayStr();
  const to = searchParams.to || from;
  const { stockIn, stockOut, warranty } = await getReportData(from, to);
  const warrantyGroups = groupWarrantyByCustomerProduct(warranty);
  const stockInGroups = groupStockInByProduct(stockIn);

  const totalIn = stockIn.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalOut = stockOut.reduce((s: number, i: any) => s + i.quantity, 0);
  const periodLabel = from === to ? formatDateShort(from) : `${formatDateShort(from)} - ${formatDateShort(to)}`;
  const t = docText("th");

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Screen-only controls */}
      <div className="no-print sticky top-14 md:top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur flex items-center justify-between gap-3">
        <Link href="/reports" className="text-sm font-medium text-brand">← กลับ</Link>
        <PdfDownloadButton
          targetId="print-area"
          fileName={`report_${from}${from === to ? "" : `_${to}`}.pdf`}
          labels={{
            open: t.pdf,
            busy: t.pdfBusy,
            error: t.pdfError,
            title: t.pdfTitle,
            download: t.pdfDownload,
            close: t.pdfClose,
          }}
        />
      </div>

      {/* Printable report */}
      <div
        id="print-area"
        className="mx-auto my-0 min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg print:m-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
      >
        <DocumentHeader title="รายงานประจำวัน" issuedAt={new Date().toISOString()} />

        <div data-pdf-block className="relative mb-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">ช่วงวันที่</p>
          <p className="mt-1 text-base font-bold text-slate-900">{periodLabel}</p>
        </div>

        <div data-pdf-block className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-center">
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">รับเข้า</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{totalIn}</p>
            <p className="text-xs text-slate-500">{stockIn.length} รายการ</p>
          </div>
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">ขายออก</p>
            <p className="mt-1 text-2xl font-bold text-red-500">{totalOut}</p>
            <p className="text-xs text-slate-500">{stockOut.length} รายการ</p>
          </div>
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">ลงทะเบียนประกัน</p>
            <p className="mt-1 text-2xl font-bold text-brand">{warranty.length}</p>
            <p className="text-xs text-slate-500">รายการ</p>
          </div>
        </div>

        <ReportSection title="รับสินค้าเข้า">
          {stockInGroups.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="w-full text-[13px]">
              <thead className={theadClass}>
                <tr data-pdf-block className={trHeadClass}>
                  <th className="py-2 pr-2 font-medium w-20"></th>
                  <th className="py-2 pr-2 font-medium">วันที่</th>
                  <th className="py-2 pr-2 font-medium">สินค้า</th>
                  <th className="py-2 pr-2 font-medium">ซัพพลายเออร์</th>
                  <th className="py-2 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {stockInGroups.map((group) => (
                  <tr key={`${group.product_name}__${group.product_model}`} data-pdf-block className={rowClass}>
                    <td className="py-2.5 pr-2">
                      <ThumbCell src={group.image_url} alt={group.product_name} />
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500 whitespace-nowrap">
                      {group.earliest_date && group.latest_date
                        ? formatDateRange(group.earliest_date, group.latest_date)
                        : "-"}
                    </td>
                    <td className="py-2.5 pr-2 text-gray-900">
                      {group.product_name}
                      {group.product_model && <span className="text-gray-500"> · {group.product_model}</span>}
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500">{group.supplier}</td>
                    <td className="py-2.5 text-right text-green-600 font-medium whitespace-nowrap">
                      +{group.quantity} {group.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="ขายสินค้าออก">
          {stockOut.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="w-full text-[13px]">
              <thead className={theadClass}>
                <tr data-pdf-block className={trHeadClass}>
                  <th className="py-2 pr-2 font-medium w-20"></th>
                  <th className="py-2 pr-2 font-medium">วันที่</th>
                  <th className="py-2 pr-2 font-medium">สินค้า</th>
                  <th className="py-2 pr-2 font-medium">ลูกค้า / โปรเจค</th>
                  <th className="py-2 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {stockOut.map((item: any) => (
                  <tr key={item.id} data-pdf-block className={rowClass}>
                    <td className="py-2.5 pr-2">
                      <ThumbCell src={item.products_mf?.image_urls?.[0]} alt={item.products_mf?.name ?? ""} />
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500 whitespace-nowrap">{formatDateShort(item.sold_date)}</td>
                    <td className="py-2.5 pr-2 text-gray-900">
                      {item.products_mf?.name}
                      {item.products_mf?.model && <span className="text-gray-500"> · {item.products_mf.model}</span>}
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500">
                      {item.customer_name}
                      {item.project_name ? ` · ${item.project_name}` : ""}
                    </td>
                    <td className="py-2.5 text-right text-red-500 font-medium whitespace-nowrap">
                      -{item.quantity} {item.products_mf?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="ลงทะเบียนประกัน">
          {warrantyGroups.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="w-full text-[13px]">
              <thead className={theadClass}>
                <tr data-pdf-block className={trHeadClass}>
                  <th className="py-2 pr-2 font-medium w-20"></th>
                  <th className="py-2 pr-2 font-medium">วันที่</th>
                  <th className="py-2 pr-2 font-medium">ลูกค้า</th>
                  <th className="py-2 pr-2 font-medium">สินค้า</th>
                  <th className="py-2 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {warrantyGroups.map((group) => (
                  <tr
                    key={`${group.customer_name}__${group.product_name}__${group.product_model}`}
                    data-pdf-block
                    className={rowClass}
                  >
                    <td className="py-2.5 pr-2">
                      <ThumbCell src={group.image_url} alt={group.product_name} />
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500 whitespace-nowrap">
                      {group.earliest_date && group.latest_date
                        ? formatDateRange(group.earliest_date, group.latest_date)
                        : "-"}
                    </td>
                    <td className="py-2.5 pr-2 text-gray-900">{group.customer_name}</td>
                    <td className="py-2.5 pr-2 text-gray-900">
                      {group.product_name}
                      {group.product_model && <span className="text-gray-500"> · {group.product_model}</span>}
                    </td>
                    <td className="py-2.5 text-right text-brand font-medium whitespace-nowrap">
                      {group.quantity} {group.unit ?? "ชิ้น"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <div data-pdf-block className="mt-8 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-500">พิมพ์เมื่อ {formatDate(new Date().toISOString())}</p>
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

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 data-pdf-block className="mb-2 border-l-4 border-brand pl-2 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <p data-pdf-block className="py-2 text-sm text-slate-500">ไม่มีรายการ</p>;
}

function ThumbCell({ src, alt }: { src?: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-14 w-14 rounded-lg border border-slate-100 bg-slate-50 object-contain sm:h-16 sm:w-16" />
  ) : (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 sm:h-16 sm:w-16">MF</div>
  );
}
