import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { DocumentHeader } from "@/components/ui/DocumentHeader";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { docLang, docText, formatDocDate, unitLabel } from "@/lib/docI18n";
import { ITEM_SELECT, applyItemOrder, getCustomerLines, getItemOrder, getItemPhotoUrls, isCustom, itemName, itemUnit, productImage } from "@/lib/deliveryItems";

async function getPrinterName() {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name ?? null;
}

export default async function PrintDeliveryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { doc?: string; lang?: string; preview?: string };
}) {
  const isNote = searchParams.doc === "note";
  const lang = docLang(searchParams.lang);
  const t = docText(lang);
  const docParam = isNote ? "note" : "prep";
  const supabase = createClient();
  const [{ data: delivery }, printerName] = await Promise.all([
    supabase
      .from("deliveries_mf")
      .select(`*, delivery_items_mf(${ITEM_SELECT})`)
      .eq("id", params.id)
      .single(),
    getPrinterName(),
  ]);
  if (!delivery) notFound();

  const { data: customer } = await supabase
    .from("customers_mf")
    .select("contact_person, phone, address, tax_id")
    .eq("name", delivery.customer_name)
    .maybeSingle();

  const items: any[] = applyItemOrder(delivery.delivery_items_mf ?? [], await getItemOrder(supabase, delivery.id));
  const photoUrls = await getItemPhotoUrls(supabase, items);

  // customer note: show the customer-facing lines, then any prep line not assigned to one
  const customerLines = isNote ? await getCustomerLines(supabase, delivery.id) : null;
  const useCustomerLines = !!customerLines && customerLines.lines.length > 0;
  // quantity of a prep line already put into customer lines is not repeated; the rest still shows
  const allocated = new Map<string, number>();
  for (const l of customerLines?.links ?? []) {
    allocated.set(l.deliveryItemId, (allocated.get(l.deliveryItemId) ?? 0) + l.quantity);
  }
  const rows = items
    .map((i) => ({ ...i, shownQty: useCustomerLines ? Math.max(0, i.quantity - (allocated.get(i.id) ?? 0)) : i.quantity }))
    .filter((i) => i.shownQty > 0);
  const totalQty =
    rows.reduce((n, i) => n + i.shownQty, 0) +
    (useCustomerLines ? customerLines!.lines.reduce((n, l) => n + l.quantity, 0) : 0);

  const printedOn = formatDocDate(new Date().toISOString(), lang);
  const langLink = (target: "th" | "en") => `/deliveries/${delivery.id}/print?doc=${docParam}&lang=${target}`;
  const toggle = "inline-flex items-center justify-center h-9 min-w-10 px-2.5 rounded-md text-sm font-semibold";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur flex items-center justify-between gap-3">
        <Link href={`/deliveries/${delivery.id}`} className="text-sm font-medium text-brand">{t.back}</Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5" aria-label="Language">
            <Link href={langLink("th")} className={`${toggle} ${lang === "th" ? "bg-brand text-white" : "text-gray-700"}`}>
              ไทย
            </Link>
            <Link href={langLink("en")} className={`${toggle} ${lang === "en" ? "bg-brand text-white" : "text-gray-700"}`}>
              EN
            </Link>
          </div>
          <PdfDownloadButton
            autoOpen={searchParams.preview === "1"}
            targetId="print-area"
            fileName={`${delivery.doc_no}_${isNote ? "delivery-note" : "picking-list"}${lang === "en" ? "-EN" : ""}.pdf`}
            labels={{
              open: t.pdf,
              busy: t.pdfBusy,
              error: t.pdfError,
              title: t.pdfTitle,
              download: t.pdfDownload,
              close: t.pdfClose,
            }}
          />
        </div>
      </div>

      <div
        id="print-area"
        className="mx-auto my-0 min-h-screen max-w-[210mm] bg-white px-5 py-7 text-[13px] leading-normal shadow-none sm:my-6 sm:min-h-0 sm:px-10 sm:py-9 sm:shadow-lg print:m-0 print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
      >
        <DocumentHeader
          title={isNote ? t.noteTitle : t.pickTitle}
          docNo={delivery.doc_no}
          issuedAt={new Date().toISOString()}
          lang={lang}
        />

        <div data-pdf-block className="relative mb-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50 p-4 pl-5 text-[13px]">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">{t.customer}</p>
              <p className="text-base font-bold leading-snug text-slate-900">{delivery.customer_name}</p>
              {customer?.address && <p className="max-w-xl text-slate-600">{customer.address}</p>}
              {customer?.tax_id && <p className="text-xs text-slate-600">{t.taxId} {customer.tax_id}</p>}
              {(customer?.contact_person || customer?.phone) && (
                <p className="text-xs text-slate-600">
                  {t.contact} {[customer.contact_person, customer.phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="sm:min-w-40 sm:border-l sm:border-brand-200 sm:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                {t.project.replace(":", "")}
              </p>
              <p className="mt-1 font-semibold text-slate-900">{delivery.project_name ?? "-"}</p>
              {delivery.po_number && (
                <>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">{t.poNo}</p>
                  <p className="mt-1 font-semibold text-slate-900">{delivery.po_number}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div data-pdf-block className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-[13px] sm:grid-cols-[0.9fr_1.1fr_2fr]">
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">{t.scheduled}</p>
            <p className="mt-1 font-semibold text-slate-900">
              {delivery.scheduled_date ? formatDocDate(delivery.scheduled_date, lang) : "-"}
            </p>
          </div>
          <div className="bg-white p-3">
            <p className="text-[11px] text-slate-500">{t.receiver}</p>
            <p className="mt-1 font-semibold text-slate-900">{delivery.receiver_name || "-"}</p>
            {delivery.receiver_phone && <p className="mt-0.5 text-xs text-slate-500">{t.phone} {delivery.receiver_phone}</p>}
          </div>
          <div className="col-span-2 bg-white p-3 sm:col-span-1">
            <p className="text-[11px] text-slate-500">{t.address}</p>
            <p className="mt-1 font-semibold leading-snug text-slate-900">{delivery.delivery_address || customer?.address || "-"}</p>
          </div>
        </div>

        <div className="mb-4 overflow-hidden">
          <table className="w-full text-[13px]">
          <thead className="bg-slate-50">
            <tr data-pdf-block className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {!isNote && <th className="py-2 pr-2 font-medium w-8">✓</th>}
              <th className="py-2 pr-2 font-medium w-8">#</th>
              <th className="py-2 pr-2 font-medium w-32"></th>
              <th className="py-2 pr-2 font-medium">{t.item}</th>
              <th className="py-2 text-right font-medium">{t.qty}</th>
            </tr>
          </thead>
          <tbody>
            {useCustomerLines &&
              customerLines!.lines.map((l, idx) => {
                const label = lang === "en" && l.labelEn ? l.labelEn : l.label;
                return (
                  <tr key={l.id} data-pdf-block className="border-b border-slate-100 align-top last:border-b-0">
                    <td className="py-2.5 pr-2 text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 pr-2">
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.imageUrl} alt={label} className="h-24 w-24 rounded-lg border border-slate-100 bg-slate-50 object-contain sm:h-28 sm:w-28" />
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-2 text-gray-900 whitespace-pre-line">{label}</td>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap">
                      {l.quantity} {unitLabel(l.unit, l.quantity, lang)}
                    </td>
                  </tr>
                );
              })}
            {rows.map((i, idx) => (
              <tr key={i.id} data-pdf-block className="border-b border-slate-100 align-top last:border-b-0">
                {!isNote && (
                  <td className="py-2.5 pr-2">
                    <span className="inline-block h-5 w-5 rounded border-2 border-slate-400" />
                  </td>
                )}
                <td className="py-2.5 pr-2 text-gray-500">{(useCustomerLines ? customerLines!.lines.length : 0) + idx + 1}</td>
                <td className="py-2.5 pr-2">
                  {productImage(i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImage(i)!} alt={itemName(i)} className="h-24 w-24 rounded-lg border border-slate-100 bg-slate-50 object-contain sm:h-28 sm:w-28" />
                  ) : (
                    // no catalogue picture (made-to-order line): the attached photos take the picture column
                    <div className="flex flex-col gap-1.5">
                      {((i.image_paths ?? []) as string[]).map((path) =>
                        photoUrls.get(path) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={path} src={photoUrls.get(path)} alt={t.photoAlt} className="h-24 w-24 rounded-lg border border-slate-100 bg-slate-50 object-contain sm:h-28 sm:w-28" />
                        ) : null
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-gray-900">
                  {itemName(i)}
                  {i.products_mf?.model && <span className="text-gray-500"> · {i.products_mf.model}</span>}
                  {isCustom(i) && (
                    <p className="mt-1">
                      <span data-pdf-badge className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] leading-4 text-yellow-800">{t.madeToOrder}</span>
                    </p>
                  )}
                  {i.custom_source && (
                    <p className="text-xs text-gray-500">
                      {t.source} {i.custom_source}
                    </p>
                  )}
                  {i.item_note && <p className="text-xs text-gray-600">{i.item_note}</p>}
                  {productImage(i) && (i.image_paths ?? []).length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {(i.image_paths as string[]).map((path) =>
                        photoUrls.get(path) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={path} src={photoUrls.get(path)} alt={t.photoAlt} className="h-24 w-24 rounded-lg border border-slate-200 object-cover sm:h-28 sm:w-28" />
                        ) : null
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2.5 text-right font-medium whitespace-nowrap">
                  {i.shownQty} {unitLabel(itemUnit(i), i.shownQty, lang)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-brand-50/70">
            <tr className="border-t border-brand-100">
              <td colSpan={isNote ? 3 : 4} className="px-3 py-3 text-right font-medium text-brand-800">{t.total}</td>
              <td className="py-3 pr-3 text-right font-bold text-brand-900 whitespace-nowrap">
                {totalQty} {unitLabel("ชิ้น", totalQty, lang)}
              </td>
            </tr>
          </tfoot>
          </table>
        </div>

        {delivery.note && (
          <div data-pdf-block className="mb-3 py-2 text-[13px] text-slate-700">
            <span className="font-semibold text-amber-800">{t.note}</span> {delivery.note}
          </div>
        )}

        {isNote && (
          <div data-pdf-block className="mb-4 flex gap-3 py-2 text-[13px] text-slate-700">
            <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-slate-400 bg-white" />
            <p>{t.received}</p>
          </div>
        )}

        <div data-pdf-block className="mb-8 mt-5">
          <p className="text-xs text-gray-500 mb-2">{t.extraNote}</p>
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
        </div>

        <div data-pdf-block className="mt-10 grid grid-cols-2 gap-4 break-inside-avoid text-xs sm:gap-8">
          {isNote ? (
            <>
              <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label={t.sender} lang={lang} /></div>
              <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4"><SignatureBlock label={t.customerSign} lang={lang} /></div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label={t.picker} lang={lang} /></div>
              <div className="rounded-xl border border-slate-200 p-4"><SignatureBlock label={t.checker} lang={lang} /></div>
            </>
          )}
        </div>

        <div data-pdf-block className="mt-10 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-500">{t.printedOn} {printedOn} {t.by} {printerName ?? "-"}</p>
          <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-brand-700">MINDFORM · BUILT FOR BETTER WORK</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A4 portrait; margin: 15mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
