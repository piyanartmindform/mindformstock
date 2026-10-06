import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/utils";

export function DocumentHeader({ title, issuedAt, docNo }: { title: string; issuedAt: string; docNo?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-brand pb-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-xl shrink-0">
          M
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">
          <p className="font-bold text-gray-900 text-base">{COMPANY.nameTh}</p>
          <p className="text-gray-500">{COMPANY.nameEn}</p>
          <p className="mt-1">{COMPANY.addressTh}</p>
          <p>เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-gray-900 text-base">{title}</p>
        {docNo && <p className="text-gray-600 text-xs font-mono mt-1">เลขที่ {docNo}</p>}
        <p className="text-gray-500 text-xs mt-2">วันที่ออกเอกสาร</p>
        <p className="text-gray-900 font-medium text-sm">{formatDate(issuedAt)}</p>
      </div>
    </div>
  );
}
