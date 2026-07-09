import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { PrintButton } from "@/components/ui/PrintButton";

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

  const codes = await getCodes(batchId);
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
          @page { size: A4 portrait; margin: 5mm; }
          .label-page {
            width: 200mm;
            height: 287mm;
          }
        }
        .label-page {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          grid-template-rows: repeat(13, 1fr);
          width: 200mm;
          height: 287mm;
          box-sizing: border-box;
        }
        .label-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        .label-code {
          font-size: 4.5pt;
          font-family: monospace;
          line-height: 1;
          margin: 0.5mm 0 0 0;
          text-align: center;
          letter-spacing: -0.3pt;
        }
      `}</style>

      {/* Controls — hidden when printing */}
      <div className="no-print p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between sticky top-14 md:top-0 z-10">
        <div>
          <p className="font-semibold text-gray-900">QR Batch — {codes.length} ดวง</p>
          <p className="text-xs text-gray-500 mt-0.5">กระดาษ E-128 (21×17mm) · 10 คอลัมน์</p>
        </div>
        <div className="flex gap-2">
          <PrintButton label="🖨️ พิมพ์" />
        </div>
      </div>

      {/* QR grid */}
      <div className="p-2 print:p-0">
        <div className="label-page">
          {qrImages.map((c) => (
            <div key={c.id} className="label-cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.dataUrl} alt={c.code} style={{ width: "15mm", height: "15mm" }} />
              <p className="label-code">{c.code}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
