import { docText, type DocLang } from "@/lib/docI18n";

export function SignatureBlock({ label, lang = "th" }: { label: string; lang?: DocLang }) {
  const t = docText(lang);
  return (
    <div>
      <div className="h-16 border-b border-gray-400 mb-2" />
      <p className="text-gray-500">
        {t.signed} {label}
      </p>
      <p className="text-gray-400 text-xs mt-1">{t.date} ____ / ____ / ____</p>
    </div>
  );
}
