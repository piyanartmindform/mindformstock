import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { docText } from "@/lib/docI18n";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { SignatureBlock } from "@/components/ui/SignatureBlock";

async function getExpected(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_expected_mf")
    .select("*, products_mf(name, model, unit, image_urls)")
    .eq("id", id)
    .single();
  return data;
}

async function getPrinterName() {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name ?? null;
}

export default async function PrintExpectedInPage({ params }: { params: { id: string } }) {
  const [item, printerName] = await Promise.all([getExpected(params.id), getPrinterName()]);
  if (!item) notFound();

  const t = docText("th");
  const remaining = item.expected_quantity - item.received_quantity;
  const unit = item.products_mf?.unit ?? "";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur flex items-center justify-between">
        <Link href="/stock-in/expected" className="text-sm font-medium text-brand">← กลับ</Link>
        <PdfDownloadButton
          targetId="print-area"
          fileName={`work-order-in_${new Date().toISOString().slice(0, 10)}.pdf`}
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

      <div id="print-area" className="mx-auto my-0 min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg print:m-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <DocumentHeader title="ใบงานรับสินค้าเข้า" issuedAt={new Date().toISOString()} />

        <div data-pdf-block className="relative mb-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <div className="flex items-center gap-4">
            {item.products_mf?.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.products_mf.image_urls[0]} alt={item.products_mf.name} className="h-24 w-24 shrink-0 rounded-lg border border-brand-100 bg-white object-contain sm:h-28 sm:w-28" />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-2xl font-bold text-brand-700 sm:h-28 sm:w-28">MF</div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">สินค้า</p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {item.products_mf?.name ?? "-"}
                {item.products_mf?.model && <span className="font-normal text-slate-500"> · {item.products_mf.model}</span>}
              </p>
            </div>
          </div>
        </div>

        <div data-pdf-block className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">จำนวนที่คาดว่าจะเข้า</p>
            <p className="mt-1 font-semibold text-slate-900">{item.expected_quantity} {unit}</p>
          </div>
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">รับแล้ว / คงเหลือ</p>
            <p className="mt-1 font-semibold text-slate-900">{item.received_quantity} / {remaining} {unit}</p>
          </div>
          {item.note && (
            <div className="col-span-2 bg-white p-3">
              <p className="text-[11px] text-slate-500">หมายเหตุ</p>
              <p className="mt-1 font-medium text-slate-900">{item.note}</p>
            </div>
          )}
        </div>

        <div data-pdf-block className="mb-6 py-2">
          <label className="flex items-center gap-3 text-slate-700">
            <span className="h-4 w-4 shrink-0 rounded border border-slate-400 bg-white" />
            รับสินค้าครบตามจำนวนแล้ว
          </label>
        </div>

        <div data-pdf-block className="mb-8 mt-5">
          <p className="mb-2 text-xs text-slate-500">หมายเหตุเพิ่มเติม</p>
          <div className="h-9 border-b border-slate-300" />
          <div className="h-9 border-b border-slate-300" />
          <div className="h-9 border-b border-slate-300" />
        </div>

        <div data-pdf-block className="mt-10 grid grid-cols-2 gap-4 break-inside-avoid text-xs sm:gap-8">
          <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label="ผู้รับสินค้า" /></div>
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4"><SignatureBlock label="ผู้ตรวจสอบ" /></div>
        </div>

        <div data-pdf-block className="mt-10 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-500">พิมพ์เมื่อ {formatDate(new Date().toISOString())} โดย {printerName ?? "-"}</p>
          <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-brand-700">MINDFORM · BUILT FOR BETTER WORK</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A4 portrait; margin: 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
