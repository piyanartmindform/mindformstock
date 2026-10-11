import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { PrintButton } from "@/components/ui/PrintButton";
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
  searchParams: { doc?: string; lang?: string };
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
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="no-print sticky top-14 md:top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between gap-3">
        <Link href={`/deliveries/${delivery.id}`} className="text-sm text-brand">{t.back}</Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5" aria-label="Language">
            <Link href={langLink("th")} className={`${toggle} ${lang === "th" ? "bg-brand text-white" : "text-gray-700"}`}>
              ไทย
            </Link>
            <Link href={langLink("en")} className={`${toggle} ${lang === "en" ? "bg-brand text-white" : "text-gray-700"}`}>
              EN
            </Link>
          </div>
          <PrintButton label={isNote ? t.printNote : t.printPick} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 print:p-0 bg-white print:bg-white">
        <DocumentHeader
          title={isNote ? t.noteTitle : t.pickTitle}
          docNo={delivery.doc_no}
          issuedAt={new Date().toISOString()}
          lang={lang}
        />

        <div className="border border-gray-300 rounded-lg p-4 text-sm mb-4 space-y-1">
          <p className="text-gray-500 text-xs">{t.customer}</p>
          <p className="text-gray-900 font-bold">{delivery.customer_name}</p>
          {customer?.address && <p className="text-gray-700">{customer.address}</p>}
          {customer?.tax_id && (
            <p className="text-gray-700">
              {t.taxId} {customer.tax_id}
            </p>
          )}
          {(customer?.contact_person || customer?.phone) && (
            <p className="text-gray-700">
              {t.contact} {[customer.contact_person, customer.phone].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-gray-700 pt-1">
            {t.project} <span className="font-medium text-gray-900">{delivery.project_name ?? "-"}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500 text-xs">{t.scheduled}</p>
            <p className="text-gray-900 font-medium">
              {delivery.scheduled_date ? formatDocDate(delivery.scheduled_date, lang) : "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">{t.receiver}</p>
            <p className="text-gray-900 font-medium">{delivery.receiver_name || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-xs">{t.address}</p>
            <p className="text-gray-900 font-medium">{delivery.delivery_address || customer?.address || "-"}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-300">
              {!isNote && <th className="py-2 pr-2 font-medium w-8">✓</th>}
              <th className="py-2 pr-2 font-medium w-8">#</th>
              <th className="py-2 pr-2 font-medium w-24"></th>
              <th className="py-2 pr-2 font-medium">{t.item}</th>
              <th className="py-2 text-right font-medium">{t.qty}</th>
            </tr>
          </thead>
          <tbody>
            {useCustomerLines &&
              customerLines!.lines.map((l, idx) => {
                const label = lang === "en" && l.labelEn ? l.labelEn : l.label;
                return (
                  <tr key={l.id} className="border-b border-gray-200 align-top">
                    <td className="py-2.5 pr-2 text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 pr-2">
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.imageUrl} alt={label} className="w-20 h-20 rounded-md object-contain bg-gray-50 border border-gray-100" />
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-2 text-gray-900">{label}</td>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap">
                      {l.quantity} {unitLabel(l.unit, l.quantity, lang)}
                    </td>
                  </tr>
                );
              })}
            {rows.map((i, idx) => (
              <tr key={i.id} className="border-b border-gray-200 align-top">
                {!isNote && (
                  <td className="py-2.5 pr-2">
                    <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded" />
                  </td>
                )}
                <td className="py-2.5 pr-2 text-gray-500">{(useCustomerLines ? customerLines!.lines.length : 0) + idx + 1}</td>
                <td className="py-2.5 pr-2">
                  {productImage(i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImage(i)!} alt={itemName(i)} className="w-20 h-20 rounded-md object-contain bg-gray-50 border border-gray-100" />
                  ) : null}
                </td>
                <td className="py-2.5 pr-2 text-gray-900">
                  {itemName(i)}
                  {i.products_mf?.model && <span className="text-gray-500"> · {i.products_mf.model}</span>}
                  {isCustom(i) && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 align-middle">{t.madeToOrder}</span>
                  )}
                  {i.custom_source && (
                    <p className="text-xs text-gray-500">
                      {t.source} {i.custom_source}
                    </p>
                  )}
                  {i.item_note && <p className="text-xs text-gray-600">{i.item_note}</p>}
                  {(i.image_paths ?? []).length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {(i.image_paths as string[]).map((path) =>
                        photoUrls.get(path) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={path} src={photoUrls.get(path)} alt={t.photoAlt} className="w-24 h-24 rounded-md object-cover border border-gray-200" />
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
          <tfoot>
            <tr>
              <td colSpan={isNote ? 3 : 4} className="py-2 text-right text-gray-500">{t.total}</td>
              <td className="py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                {totalQty} {unitLabel("ชิ้น", totalQty, lang)}
              </td>
            </tr>
          </tfoot>
        </table>

        {delivery.note && (
          <p className="text-sm text-gray-700 mb-4">
            <span className="text-gray-500">{t.note}</span> {delivery.note}
          </p>
        )}

        {isNote && <p className="text-sm text-gray-700 mb-2">{t.received}</p>}

        <div className="mb-8 mt-6">
          <p className="text-xs text-gray-500 mb-2">{t.extraNote}</p>
          <div className="border-b border-gray-300 h-9" />
          <div className="border-b border-gray-300 h-9" />
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mt-12 break-inside-avoid">
          {isNote ? (
            <>
              <SignatureBlock label={t.sender} lang={lang} />
              <SignatureBlock label={t.customerSign} lang={lang} />
            </>
          ) : (
            <>
              <SignatureBlock label={t.picker} lang={lang} />
              <SignatureBlock label={t.checker} lang={lang} />
            </>
          )}
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-10">
          {t.printedOn} {printedOn} {t.by} {printerName ?? "-"}
        </p>
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
