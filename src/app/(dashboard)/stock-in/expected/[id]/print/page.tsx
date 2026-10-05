import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { PrintButton } from "@/components/ui/PrintButton";
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

  const remaining = item.expected_quantity - item.received_quantity;
  const unit = item.products_mf?.unit ?? "";

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <Link href="/stock-in/expected" className="text-sm text-brand">← กลับ</Link>
        <PrintButton label="🖨️ พิมพ์ใบงาน" />
      </div>

      <div className="max-w-2xl mx-auto p-6 print:p-0 bg-white print:bg-white">
        <DocumentHeader title="ใบงานรับสินค้าเข้า" issuedAt={new Date().toISOString()} />

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="col-span-2 flex items-center gap-3">
            {item.products_mf?.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.products_mf.image_urls[0]} alt={item.products_mf.name} className="w-14 h-14 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">📦</div>
            )}
            <div>
              <p className="text-gray-500 text-xs">สินค้า</p>
              <p className="text-gray-900 font-medium">
                {item.products_mf?.name ?? "-"}
                {item.products_mf?.model && <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>}
              </p>
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs">จำนวนที่คาดว่าจะเข้า</p>
            <p className="text-gray-900 font-medium">{item.expected_quantity} {unit}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">รับแล้ว / คงเหลือ</p>
            <p className="text-gray-900 font-medium">{item.received_quantity} / {remaining} {unit}</p>
          </div>
          {item.note && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs">หมายเหตุ</p>
              <p className="text-gray-900 font-medium">{item.note}</p>
            </div>
          )}
        </div>

        <div className="border border-gray-300 rounded-xl p-4 mb-8">
          <label className="flex items-center gap-3 text-sm text-gray-800">
            <span className="w-5 h-5 border-2 border-gray-400 rounded shrink-0" />
            รับสินค้าครบตามจำนวนแล้ว
          </label>
        </div>

        <div className="mb-12">
          <p className="text-xs text-gray-500 mb-2">หมายเหตุเพิ่มเติม</p>
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mt-12 break-inside-avoid">
          <SignatureBlock label="ผู้รับสินค้า" />
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
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
