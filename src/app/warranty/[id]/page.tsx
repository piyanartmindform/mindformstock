import { createClient } from "@/lib/supabase/server";
import { isWarrantyActive } from "@/lib/utils";
import { notFound } from "next/navigation";

type Language = "th" | "en";

const COPY = {
  th: {
    headerSubtitle: "ใบรับประกันสินค้า",
    languageLabel: "เลือกภาษา",
    pendingLabel: "สถานะรอดำเนินการ",
    pendingTitle: "ยังไม่ได้ลงทะเบียนประกัน",
    pendingDescription: "สินค้าชิ้นนี้ยังไม่มีข้อมูลการรับประกันในระบบ กรุณาติดต่อเจ้าหน้าที่ MINDFORM",
    warrantyStatus: "สถานะการรับประกัน",
    active: "อยู่ในระยะประกัน",
    expired: "หมดระยะประกันแล้ว",
    noWarranty: "สินค้านี้ไม่มีประกัน",
    coveredUntil: "คุ้มครองถึง",
    endedOn: "สิ้นสุดเมื่อ",
    productInfo: "ข้อมูลสินค้า",
    model: "รุ่น",
    warrantyDetails: "รายละเอียดการรับประกัน",
    warrantyStart: "เริ่มประกัน",
    warrantyEnd: "สิ้นสุดประกัน",
    reference: "เลขอ้างอิง",
    needService: "ต้องการรับบริการ?",
    contactTitle: "ติดต่อ MINDFORM",
    contactDescription: "สอบถามข้อมูลการรับประกันหรือแจ้งขอรับบริการได้ผ่านช่องทางด้านล่าง",
    verifiedBy: "ตรวจสอบข้อมูลโดย MINDFORM",
  },
  en: {
    headerSubtitle: "Warranty Certificate",
    languageLabel: "Choose language",
    pendingLabel: "Pending registration",
    pendingTitle: "Warranty not registered",
    pendingDescription: "This product has not been registered for warranty. Please contact MINDFORM for assistance.",
    warrantyStatus: "Warranty status",
    active: "Warranty active",
    expired: "Warranty expired",
    noWarranty: "No warranty coverage",
    coveredUntil: "Covered until",
    endedOn: "Coverage ended",
    productInfo: "Product information",
    model: "Model",
    warrantyDetails: "Warranty details",
    warrantyStart: "Coverage starts",
    warrantyEnd: "Coverage ends",
    reference: "Reference",
    needService: "Need assistance?",
    contactTitle: "Contact MINDFORM",
    contactDescription: "Contact us for warranty information or service assistance.",
    verifiedBy: "Information verified by MINDFORM",
  },
} as const;

async function getQRCode(code: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("qr_codes_mf")
    .select("*, products_mf(name, model, brand, description)")
    .eq("code", code.toUpperCase())
    .single();
  return data;
}

function formatWarrantyDate(date: string, language: Language): string {
  return new Date(date).toLocaleDateString(language === "th" ? "th-TH" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function BrandHeader({ language }: { language: Language }) {
  const copy = COPY[language];

  return (
    <header className="relative overflow-hidden bg-brand-800 px-5 pb-10 pt-4 text-white">
      <div className="absolute -right-14 -top-20 h-44 w-44 rounded-full bg-brand-500/30" />
      <div className="absolute -right-4 top-16 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative mx-auto max-w-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-base font-black shadow-lg shadow-black/10">
              M
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold tracking-wide">MINDFORM</p>
              <p className="truncate text-sm text-brand-100">{copy.headerSubtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 rounded-lg bg-white/10 p-0.5" aria-label={copy.languageLabel}>
            {(["th", "en"] as const).map((option) => (
              <a
                key={option}
                href={`?lang=${option}`}
                aria-current={language === option ? "page" : undefined}
                className={`flex h-9 min-w-10 items-center justify-center rounded-md px-2.5 text-sm font-semibold ${
                  language === option ? "bg-white text-brand-800" : "text-white"
                }`}
              >
                {option === "th" ? "ไทย" : "EN"}
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusIcon({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
      {active ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-[2.5]">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current stroke-[2.5]">
          <path strokeLinecap="round" d="M7 7l10 10M17 7 7 17" />
        </svg>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueClassName = "text-gray-900" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-gray-100 py-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className={`break-words text-right text-sm font-semibold ${valueClassName}`}>{value}</dd>
    </div>
  );
}

export default async function PublicWarrantyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { lang?: string };
}) {
  const language: Language = searchParams?.lang === "en" ? "en" : "th";
  const copy = COPY[language];
  const item = await getQRCode(params.id);
  if (!item) notFound();

  const warrantyReference = `•••• ${item.code.slice(-4)}`;

  if (item.status === "unused" || item.status === "sold") {
    return (
      <main lang={language} className="min-h-screen bg-slate-100">
        <BrandHeader language={language} />
        <div className="relative z-10 mx-auto -mt-6 max-w-md px-5 pb-8">
          <section className="relative rounded-2xl bg-white px-5 py-6 text-center shadow-lg shadow-slate-900/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M10.3 4.4 3.4 16.3A2 2 0 0 0 5.1 19h13.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-amber-700">{copy.pendingLabel}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-950">{copy.pendingTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">{copy.pendingDescription}</p>
            <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-base text-gray-500">{copy.reference}</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-gray-900">{warrantyReference}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const hasWarranty = Boolean(item.warranty_expires_at);
  const active = hasWarranty && isWarrantyActive(item.warranty_expires_at);
  const statusStyle = active ? "bg-green-700" : hasWarranty ? "bg-red-700" : "bg-slate-600";

  return (
    <main lang={language} className="min-h-screen bg-slate-100 pb-10">
      <BrandHeader language={language} />

      <div className="relative z-10 mx-auto -mt-6 max-w-md space-y-3 px-5">
        <section className={`rounded-2xl p-4 text-white shadow-lg shadow-slate-900/15 ${statusStyle}`} aria-label={copy.warrantyStatus}>
          <div className="flex items-center gap-3">
            {hasWarranty ? (
              <StatusIcon active={active} />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <span className="text-2xl font-bold" aria-hidden="true">i</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white/80">{copy.warrantyStatus}</p>
              <h1 className="text-lg font-bold leading-tight">
                {active ? copy.active : hasWarranty ? copy.expired : copy.noWarranty}
              </h1>
              {hasWarranty && (
                <p className="mt-0.5 text-sm text-white/90">
                  {active ? copy.coveredUntil : copy.endedOn} {formatWarrantyDate(item.warranty_expires_at, language)}
                </p>
              )}
            </div>
          </div>
        </section>

        {item.products_mf && (
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-700">{copy.productInfo}</p>
                <h2 className="mt-0.5 text-lg font-bold leading-tight text-gray-950">{item.products_mf.name}</h2>
              </div>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.products_mf.brand && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{item.products_mf.brand}</span>
              )}
              {item.products_mf.model && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{copy.model} {item.products_mf.model}</span>
              )}
            </div>
            {item.products_mf.description && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-6 text-gray-600">{item.products_mf.description}</p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-950">{copy.warrantyDetails}</h2>
          </div>
          <dl>
            {item.purchase_date && <InfoRow label={copy.warrantyStart} value={formatWarrantyDate(item.purchase_date, language)} />}
            {hasWarranty && (
              <InfoRow
                label={copy.warrantyEnd}
                value={formatWarrantyDate(item.warranty_expires_at, language)}
                valueClassName={active ? "text-green-700" : "text-red-700"}
              />
            )}
            <InfoRow label={copy.reference} value={warrantyReference} valueClassName="font-mono text-gray-900" />
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-brand-700">{copy.needService}</p>
          <h2 className="mt-0.5 text-base font-bold text-gray-950">{copy.contactTitle}</h2>
          <p className="mt-1.5 text-sm leading-6 text-gray-600">{copy.contactDescription}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a
              href="tel:0851194292"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4H5a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-2.5l-4-1-1.3 2.2a13 13 0 0 1-8.4-8.4L8.5 8l-1-4Z" />
              </svg>
              085-1194292
            </a>
            <a
              href="mailto:info@mindform.co.th"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-700"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />
              </svg>
              info@mindform.co.th
            </a>
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-brand-600">
            <path d="M12 2 4 5v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V5l-8-3Zm-1.1 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.5-4.5 1.4 1.4-5.9 5.9Z" />
          </svg>
          <span>{copy.verifiedBy}</span>
        </div>
      </div>
    </main>
  );
}
