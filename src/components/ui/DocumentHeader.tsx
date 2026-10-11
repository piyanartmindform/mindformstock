import { COMPANY } from "@/lib/company";
import { docText, formatDocDate, type DocLang } from "@/lib/docI18n";

export function DocumentHeader({
  title,
  issuedAt,
  docNo,
  lang = "th",
}: {
  title: string;
  issuedAt: string;
  docNo?: string;
  lang?: DocLang;
}) {
  const t = docText(lang);
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-brand pb-4 mb-6">
      <div className="min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="MINDFORM" className="h-6 w-auto" />
        <div className="mt-2 text-xs text-gray-600 leading-relaxed">
          {lang === "en" ? (
            <>
              <p className="font-bold text-gray-900 text-sm">{COMPANY.nameEn}</p>
              <p>{COMPANY.addressEn}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-900 text-sm">{COMPANY.nameTh}</p>
              <p>{COMPANY.addressTh}</p>
            </>
          )}
          <p>
            {t.taxId} {COMPANY.taxId}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-gray-900 text-base">{title}</p>
        {docNo && (
          <p className="text-gray-600 text-xs font-mono mt-1">
            {t.docNo} {docNo}
          </p>
        )}
        <p className="text-gray-500 text-xs mt-2">{t.issued}</p>
        <p className="text-gray-900 font-medium text-sm">{formatDocDate(issuedAt, lang)}</p>
      </div>
    </div>
  );
}
