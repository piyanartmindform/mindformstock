import { notFound } from "next/navigation";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { SignatureBlock } from "@/components/ui/SignatureBlock";

const items = [
  { name: "โต๊ะทำงานปรับระดับไฟฟ้า", model: "MF-E120", quantity: 2, unit: "ชุด", tone: "bg-brand-100 text-brand-700" },
  { name: "เก้าอี้สำนักงานเพื่อสุขภาพ", model: "MF-ERGO 02", quantity: 4, unit: "ตัว", tone: "bg-slate-100 text-slate-500" },
];

export default function WorkOrderPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">ตัวอย่างใบส่งงาน</p>
            <p className="text-xs text-slate-500">ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">Mobile + A4</span>
        </div>
      </div>

      <article className="mx-auto min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg">
        <DocumentHeader title="ใบส่งงาน" docNo="DN-261011-001" issuedAt="2026-10-11" />

        <section className="relative mb-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5 text-[13px]">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">ลูกค้า</p>
              <p className="text-base font-bold leading-snug text-slate-900">บริษัท ตัวอย่าง จำกัด</p>
              <p className="max-w-xl text-slate-600">88 อาคารตัวอย่าง ถนนพหลโยธิน กรุงเทพมหานคร 10900</p>
              <p className="text-xs text-slate-600">ผู้ติดต่อ คุณอรทัย · 02-000-0000</p>
            </div>
            <div className="sm:min-w-40 sm:border-l sm:border-brand-200 sm:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">โปรเจค</p>
              <p className="mt-1 font-semibold text-slate-900">Sample Office</p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-[13px] sm:grid-cols-[0.9fr_1.1fr_2fr]">
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">วันนัดส่ง/ติดตั้ง</p>
            <p className="mt-1 font-semibold text-slate-900">15 ตุลาคม 2569</p>
          </div>
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">ผู้รับหน้างาน</p>
            <p className="mt-1 font-semibold text-slate-900">คุณอรทัย</p>
            <p className="mt-0.5 text-xs text-slate-500">โทร. 081-234-5678</p>
          </div>
          <div className="col-span-2 bg-white p-3 sm:col-span-1">
            <p className="text-[11px] text-slate-500">สถานที่ส่ง</p>
            <p className="mt-1 font-semibold leading-snug text-slate-900">สำนักงานชั้น 12 อาคารตัวอย่าง</p>
          </div>
        </section>

        <section className="mb-4 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-8 py-2 pl-3 pr-2">#</th>
                <th className="w-24 py-2 pr-2 sm:w-32" />
                <th className="py-2 pr-2">รายการสินค้า</th>
                <th className="py-2 pr-3 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.model} className="border-b border-slate-100 align-top last:border-b-0">
                  <td className="py-3 pl-3 pr-2 text-slate-500">{index + 1}</td>
                  <td className="py-3 pr-2">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-lg border border-white text-2xl font-bold sm:h-24 sm:w-24 ${item.tone}`}>
                      MF
                    </div>
                  </td>
                  <td className="py-3 pr-2 font-medium text-slate-900">
                    {item.name}
                    <p className="mt-1 text-xs font-normal text-slate-500">รุ่น {item.model}</p>
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-brand-50/70">
              <tr className="border-t border-brand-100">
                <td colSpan={3} className="px-3 py-3 text-right font-medium text-brand-800">รวม</td>
                <td className="py-3 pr-3 text-right font-bold text-brand-900">6 รายการ</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="mb-3 py-2 text-[13px] text-slate-700">
          <span className="font-semibold text-amber-800">หมายเหตุ:</span> กรุณาติดต่อผู้รับก่อนเข้าพื้นที่ 30 นาที
        </div>

        <div className="mb-4 flex gap-3 py-2 text-[13px] text-slate-700">
          <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-slate-400 bg-white" />
          <p>ข้าพเจ้าได้ตรวจรับสินค้าตามรายการข้างต้นครบถ้วนในสภาพเรียบร้อยแล้ว</p>
        </div>

        <div className="mb-8 mt-5">
          <p className="mb-2 text-xs text-slate-500">หมายเหตุเพิ่มเติม</p>
          <div className="h-9 border-b border-slate-300" />
          <div className="h-9 border-b border-slate-300" />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 text-xs sm:gap-8">
          <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label="ผู้ส่งสินค้า" /></div>
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4"><SignatureBlock label="ผู้รับสินค้า (ลูกค้า)" /></div>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-500">ตัวอย่างเอกสารสำหรับตรวจสอบรูปแบบ</p>
          <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-brand-700">MINDFORM · BUILT FOR BETTER WORK</p>
        </footer>
      </article>
    </main>
  );
}
