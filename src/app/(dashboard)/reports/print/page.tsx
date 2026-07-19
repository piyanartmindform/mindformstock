import Link from "next/link";
import { formatDate, groupStockInByProduct, groupWarrantyByCustomerProduct } from "@/lib/utils";
import { getReportData } from "@/lib/queries/reports";
import { PrintButton } from "@/components/ui/PrintButton";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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
  const periodLabel = from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Screen-only controls */}
      <div className="no-print sticky top-14 md:top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <Link href="/reports" className="text-sm text-brand">← กลับ</Link>
        <PrintButton label="📄 ส่งออกเป็น PDF" />
      </div>

      {/* Printable report */}
      <div className="max-w-3xl mx-auto p-6 print:p-0 bg-white print:bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold shrink-0">
            M
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">MINDFORM Stock</p>
            <p className="text-sm text-gray-500">รายงานประจำวัน</p>
          </div>
        </div>

        <div className="flex justify-between items-baseline mb-6 text-sm">
          <p className="text-gray-700">
            ช่วงวันที่: <span className="font-semibold">{periodLabel}</span>
          </p>
          <p className="text-gray-400">พิมพ์เมื่อ {formatDate(new Date().toISOString())}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">รับเข้า</p>
            <p className="text-2xl font-bold text-green-600">{totalIn}</p>
            <p className="text-xs text-gray-400">{stockIn.length} รายการ</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">ขายออก</p>
            <p className="text-2xl font-bold text-red-500">{totalOut}</p>
            <p className="text-xs text-gray-400">{stockOut.length} รายการ</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">ลงทะเบียนประกัน</p>
            <p className="text-2xl font-bold text-brand">{warranty.length}</p>
            <p className="text-xs text-gray-400">รายการ</p>
          </div>
        </div>

        <ReportSection title="รับสินค้าเข้า">
          {stockInGroups.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1.5 pr-2 font-medium w-11"></th>
                  <th className="py-1.5 pr-2 font-medium">สินค้า</th>
                  <th className="py-1.5 pr-2 font-medium">ซัพพลายเออร์</th>
                  <th className="py-1.5 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {stockInGroups.map((group) => (
                  <tr
                    key={`${group.product_name}__${group.product_model}`}
                    className="border-b border-gray-100"
                  >
                    <td className="py-1.5 pr-2">
                      <ThumbCell src={group.image_url} alt={group.product_name} />
                    </td>
                    <td className="py-1.5 pr-2 text-gray-900">
                      {group.product_name}
                      {group.product_model && <span className="text-gray-400"> · {group.product_model}</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-500">{group.supplier}</td>
                    <td className="py-1.5 text-right text-green-600 font-medium whitespace-nowrap">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1.5 pr-2 font-medium w-11"></th>
                  <th className="py-1.5 pr-2 font-medium">วันที่</th>
                  <th className="py-1.5 pr-2 font-medium">สินค้า</th>
                  <th className="py-1.5 pr-2 font-medium">ลูกค้า / โปรเจค</th>
                  <th className="py-1.5 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {stockOut.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <ThumbCell src={item.products_mf?.image_urls?.[0]} alt={item.products_mf?.name ?? ""} />
                    </td>
                    <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">{formatDate(item.sold_date)}</td>
                    <td className="py-1.5 pr-2 text-gray-900">
                      {item.products_mf?.name}
                      {item.products_mf?.model && <span className="text-gray-400"> · {item.products_mf.model}</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-500">
                      {item.customer_name}
                      {item.project_name ? ` · ${item.project_name}` : ""}
                    </td>
                    <td className="py-1.5 text-right text-red-500 font-medium whitespace-nowrap">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1.5 pr-2 font-medium w-11"></th>
                  <th className="py-1.5 pr-2 font-medium">ลูกค้า</th>
                  <th className="py-1.5 pr-2 font-medium">สินค้า</th>
                  <th className="py-1.5 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {warrantyGroups.map((group) => (
                  <tr
                    key={`${group.customer_name}__${group.product_name}__${group.product_model}`}
                    className="border-b border-gray-100"
                  >
                    <td className="py-1.5 pr-2">
                      <ThumbCell src={group.image_url} alt={group.product_name} />
                    </td>
                    <td className="py-1.5 pr-2 text-gray-900">{group.customer_name}</td>
                    <td className="py-1.5 pr-2 text-gray-900">
                      {group.product_name}
                      {group.product_model && <span className="text-gray-400"> · {group.product_model}</span>}
                    </td>
                    <td className="py-1.5 text-right text-brand font-medium whitespace-nowrap">
                      {group.quantity} {group.unit ?? "ชิ้น"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A4 portrait; margin: 15mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 break-inside-avoid">
      <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <p className="text-sm text-gray-400 py-2">ไม่มีรายการ</p>;
}

function ThumbCell({ src, alt }: { src?: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-9 h-9 rounded-md object-contain bg-gray-50 border border-gray-100" />
  ) : (
    <div className="w-9 h-9 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-sm">📦</div>
  );
}
