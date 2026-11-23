import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { getCurrentUserRole } from "@/lib/auth";
import { getCostReport, baht } from "@/lib/queries/costReport";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { docText } from "@/lib/docI18n";

const trHeadClass = "border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const rowClass = "border-b border-slate-100 last:border-b-0";

export default async function CostReportPrintPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/reports");

  const { groups, missing, totalValue, totalUnits } = await getCostReport();
  const t = docText("th");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur flex items-center justify-between gap-3">
        <Link href="/reports/cost" className="text-sm font-medium text-brand">← กลับ</Link>
        <PdfDownloadButton
          targetId="print-area"
          fileName={`cost_report_${today}.pdf`}
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

      <div
        id="print-area"
        className="mx-auto my-0 min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg print:m-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
      >
        <DocumentHeader title="สรุปต้นทุนสินค้า" issuedAt={new Date().toISOString()} />

        <div data-pdf-block className="relative mb-6 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">มูลค่าสต็อกตามราคาต้นทุน</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{baht(totalValue)}</p>
          <p className="text-xs text-slate-500">{totalUnits.toLocaleString("th-TH")} ชิ้นในสต็อก</p>
        </div>

        {groups.map((g) => (
          <div key={g.category} className="mb-6">
            <h2 data-pdf-block className="mb-2 flex justify-between border-l-4 border-brand pl-2 text-sm font-bold text-slate-900">
              <span>{g.category}</span>
              <span>{baht(g.value)}</span>
            </h2>
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50">
                <tr data-pdf-block className={trHeadClass}>
                  <th className="py-2 pr-2 font-medium">สินค้า</th>
                  <th className="py-2 pr-2 text-right font-medium">ต้นทุน/หน่วย</th>
                  <th className="py-2 pr-2 text-right font-medium">สต็อก</th>
                  <th className="py-2 text-right font-medium">มูลค่า</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id} data-pdf-block className={rowClass}>
                    <td className="py-2 pr-2 text-gray-900">
                      {r.name}
                      {r.model && <span className="text-gray-500"> · {r.model}</span>}
                    </td>
                    <td className="py-2 pr-2 text-right whitespace-nowrap">{baht(r.cost ?? 0)}</td>
                    <td className="py-2 pr-2 text-right whitespace-nowrap">{r.stock} {r.unit}</td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">{baht(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {missing.length > 0 && (
          <div className="mb-6">
            <h2 data-pdf-block className="mb-2 border-l-4 border-amber-400 pl-2 text-sm font-bold text-slate-900">
              ยังไม่มีราคาต้นทุน ({missing.length} รายการ)
            </h2>
            {missing.map((m) => (
              <p key={m.id} data-pdf-block className="py-1 text-slate-600">
                {m.name}{m.model ? ` · ${m.model}` : ""} — {m.stock} {m.unit}
              </p>
            ))}
          </div>
        )}

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
