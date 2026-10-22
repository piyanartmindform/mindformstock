import { docText, type DocLang } from "@/lib/docI18n";

export function SignatureBlock({ label, lang = "th", compact = false }: { label: string; lang?: DocLang; compact?: boolean }) {
  const t = docText(lang);
  return (
    <div>
      <div className={`${compact ? "h-8 mb-1" : "h-16 mb-2"} border-b border-gray-400`} />
      <p className="text-gray-500">
        {t.signed} {label}
      </p>
      <p className="text-gray-400 text-xs mt-1">{t.date} ____ / ____ / ____</p>
    </div>
  );
}
