import { Card } from "@/components/ui/Card";
import Image from "next/image";
import Link from "next/link";
import { formatDateShort, formatDateRange, groupWarrantyByCustomerProduct } from "@/lib/utils";
import { ReportDateFilter } from "./ReportDateFilter";
import { HistoryGroups } from "./HistoryGroups";
import { getReportData } from "@/lib/queries/reports";

function ProductThumb({ src, alt }: { src?: string | null; alt: string }) {
  return src ? (
    <Image src={src} alt={alt} width={44} height={44} className="w-11 h-11 rounded-xl object-contain bg-gray-50 shrink-0" />
  ) : (
    <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-lg">📦</div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const { stockIn, stockOut, warranty } = await getReportData(searchParams.from, searchParams.to);
  const warrantyGroups = groupWarrantyByCustomerProduct(warranty);

  const totalIn = stockIn.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalOut = stockOut.reduce((s: number, i: any) => s + i.quantity, 0);
  const isFiltered = Boolean(searchParams.from || searchParams.to);
  const historyLabel = isFiltered ? "ประวัติรับเข้า" : "ประวัติรับเข้า (ล่าสุด)";
  const historyOutLabel = isFiltered ? "ประวัติขายออก" : "ประวัติขายออก (ล่าสุด)";
  const warrantyLabel = isFiltered ? "ลงทะเบียนประกัน" : "ลงทะเบียนประกัน (ล่าสุด)";

  const printParams = new URLSearchParams();
  if (searchParams.from) printParams.set("from", searchParams.from);
  if (searchParams.to) printParams.set("to", searchParams.to);
  const printHref = printParams.toString()
    ? `/reports/print?${printParams.toString()}`
    : "/reports/print";

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
        <Link
          href={printHref}
          className="h-10 px-4 rounded-xl bg-brand text-white text-sm font-medium flex items-center gap-1.5"
        >
          <span>📄</span> ส่งออก PDF
        </Link>
      </div>

      <ReportDateFilter />

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-sm text-gray-500">รับเข้า</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalIn}</p>
          <p className="text-xs text-gray-400">ชิ้น ({stockIn.length} รายการ)</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">ขายออก</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{totalOut}</p>
          <p className="text-xs text-gray-400">ชิ้น ({stockOut.length} รายการ)</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">ลงทะเบียนประกัน</p>
          <p className="text-3xl font-bold text-brand mt-1">{warranty.length}</p>
          <p className="text-xs text-gray-400">รายการ</p>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">{historyLabel}</h2>
        <div className="space-y-2">
          <HistoryGroups items={stockIn} kind="in" limit={isFiltered ? undefined : 15} />
          {isFiltered && stockIn.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบรายการในช่วงวันที่นี้</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">{historyOutLabel}</h2>
        <div className="space-y-2">
          <HistoryGroups items={stockOut} kind="out" limit={isFiltered ? undefined : 15} />
          {isFiltered && stockOut.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบรายการในช่วงวันที่นี้</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">{warrantyLabel}</h2>
        <div className="space-y-2">
          {warrantyGroups.map((group) => (
            <Card key={`${group.customer_name}__${group.product_name}__${group.product_model}`} className="py-2.5">
              <div className="flex justify-between items-center gap-3 text-sm">
                <ProductThumb src={group.image_url} alt={group.product_name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{group.customer_name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {group.product_name}
                    {group.product_model && ` · ${group.product_model}`}
                  </p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-brand font-medium">{group.quantity} {group.unit ?? "ชิ้น"}</p>
                  {group.earliest_date && group.latest_date && (
                    <p className="text-xs text-gray-400">{formatDateRange(group.earliest_date, group.latest_date)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {isFiltered && warrantyGroups.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบรายการในช่วงวันที่นี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
