import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { PrintButton } from "@/components/ui/PrintButton";
import { getCurrentUserRole } from "@/lib/auth";
import Link from "next/link";

async function getCodes(batchId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("id, code")
    .eq("batch_id", batchId)
    .order("qr_number");
  return data ?? [];
}

export default async function PrintPage({
  searchParams,
}: {
  searchParams: { batch?: string };
}) {
  const batchId = searchParams.batch;
  if (!batchId) return <div className="p-8 text-gray-500">ไม่พบ batch</div>;

  const [codes, role] = await Promise.all([getCodes(batchId), getCurrentUserRole()]);
  if (codes.length === 0) return <div className="p-8 text-gray-500">ไม่พบข้อมูล</div>;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const qrImages = await Promise.all(
    codes.map(async (c) => {
      const url = `${appUrl}/warranty/${c.code}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 120,
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });
      return { ...c, dataUrl };
    })
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A4 portrait; margin: 12.5mm 10.5mm; }
          .label-page {
            width: 189mm;
            height: 272mm;
          }
        }
        .label-page {
          display: grid;
          grid-template-columns: repeat(8, 21mm);
          grid-template-rows: repeat(16, 17mm);
          column-gap: 3mm;
          row-gap: 0;
          width: 189mm;
          height: 272mm;
          box-sizing: border-box;
        }
        .label-cell {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 1mm;
          gap: 0.5mm;
          overflow: hidden;
          box-sizing: border-box;
        }
        .label-code-wrap {
          width: 3.5mm;
          height: 15mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .label-code {
          font-size: 6.5pt;
          font-family: monospace;
          line-height: 1;
          white-space: nowrap;
          letter-spacing: -0.2pt;
          transform: rotate(-90deg);
        }
      `}</style>

      {/* Controls — hidden when printing */}
      <div className="no-print bg-gray-50 border-b border-gray-200 sticky top-14 md:top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">QR Batch — {codes.length} ดวง</p>
            <p className="text-xs text-gray-500 mt-0.5">กระดาษ E-128 (21×17mm) · 8 คอลัมน์ × 16 แถว</p>
          </div>
          <div className="flex gap-2">
            {role === "admin" && (
              <Link
                href="/warranty/generate"
                className="h-10 px-4 rounded-xl border border-gray-300 text-sm text-gray-700 flex items-center"
              >
                สร้างใหม่
              </Link>
            )}
            <PrintButton label="🖨️ พิมพ์" />
          </div>
        </div>
        <p className="px-4 pb-3 text-xs text-amber-700 bg-amber-50 border-t border-amber-200 pt-2">
          ⚠️ ก่อนพิมพ์ ตั้งค่า Margin ในหน้าต่างพิมพ์ให้ตรงกับกรอบสติกเกอร์: <strong>บน 13.5mm · ล่าง 12.5mm · ซ้าย 10.5mm · ขวา 10.5mm</strong> มิฉะนั้นตำแหน่ง QR จะเยื้องจากกรอบสติกเกอร์
        </p>
      </div>

      {/* QR grid */}
      <div className="p-2 print:p-0">
        <div className="label-page">
          {qrImages.map((c) => (
            <div key={c.id} className="label-cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.dataUrl} alt={c.code} style={{ width: "14mm", height: "14mm" }} />
              <div className="label-code-wrap">
                <p className="label-code">{c.code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
