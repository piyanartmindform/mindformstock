"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 6; // blank space above and below on every page
// The document is laid out off-screen at this width (css px) and stretched to the full page width.
// A wider layout shrinks everything a little, so a slightly long document still fits on one page
// without side margins; 794 px is A4 at 96 dpi.
const LAYOUT_WIDTHS_PX = Array.from({ length: 21 }, (_, i) => 794 + i * 16); // 794 .. 1114

interface PreviewPage {
  dataUrl: string;
  heightMm: number;
}

export interface PdfLabels {
  open: string; // button that builds and shows the preview
  busy: string;
  error: string;
  title: string; // preview window title
  download: string;
  close: string;
}

// Builds an A4 preview of the element with id `targetId` in the browser, shows it in a window,
// and downloads it as a PDF from there. Elements marked data-pdf-block are the only places a page
// may break, so rows and signature blocks are never cut in half.
export function PdfDownloadButton({
  targetId,
  fileName,
  labels,
}: {
  targetId: string;
  fileName: string;
  labels: PdfLabels;
}) {
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<PreviewPage[] | null>(null);

  useEffect(() => {
    if (!pages) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPages(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages]);

  async function buildPreview() {
    const source = document.getElementById(targetId);
    if (!source) return;
    setBusy(true);

    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";
    try {
      const { default: html2canvas } = await import("html2canvas");

      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.maxWidth = "none";
      clone.style.margin = "0";
      // side margin as a share of the width (5.5% of 210 mm = about 11.5 mm), small top / bottom
      clone.style.padding = "18px 5.5%";
      holder.appendChild(clone);
      document.body.appendChild(holder);

      const layoutAt = (width: number) => {
        holder.style.width = `${width}px`;
        clone.style.width = `${width}px`;
        return clone.scrollHeight;
      };
      const capacityAt = (width: number) => ((PAGE_H_MM - 2 * MARGIN_MM) / PAGE_W_MM) * width; // css px per page

      // wait for the (cached) images in the clone before measuring
      layoutAt(LAYOUT_WIDTHS_PX[0]);
      await Promise.all(
        Array.from(clone.querySelectorAll("img")).map((img) =>
          img.complete ? null : new Promise((resolve) => { img.onload = img.onerror = resolve; })
        )
      );

      // smallest layout width that fits on one page, otherwise the widest (several pages)
      let width = LAYOUT_WIDTHS_PX[LAYOUT_WIDTHS_PX.length - 1];
      for (const w of LAYOUT_WIDTHS_PX) {
        if (layoutAt(w) <= capacityAt(w)) {
          width = w;
          break;
        }
      }
      const totalH = layoutAt(width);
      const pageCapacity = capacityAt(width);

      // page-break candidates: bottom edge of every block, in css px from the top of the document
      const top = clone.getBoundingClientRect().top;
      const boundaries = Array.from(clone.querySelectorAll("[data-pdf-block]"))
        .map((el) => el.getBoundingClientRect().bottom - top)
        .sort((a, b) => a - b);

      const scale = Math.min(2.5, 1800 / width);
      const canvas = await html2canvas(clone, { scale, useCORS: true, backgroundColor: "#ffffff", logging: false });

      const result: PreviewPage[] = [];
      let start = 0;
      while (start < totalH - 1) {
        const limit = start + pageCapacity;
        let cut = totalH;
        if (totalH > limit) {
          const fits = boundaries.filter((b) => b > start + 40 && b <= limit);
          cut = fits.length > 0 ? fits[fits.length - 1] : limit;
        }

        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.max(1, Math.round((cut - start) * scale));
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, Math.round(start * scale), canvas.width, slice.height, 0, 0, slice.width, slice.height);

        result.push({ dataUrl: slice.toDataURL("image/jpeg", 0.92), heightMm: ((cut - start) / width) * PAGE_W_MM });
        start = cut;
      }

      setPages(result);
    } catch (err) {
      console.error(err);
      alert(labels.error);
    } finally {
      holder.remove();
      setBusy(false);
    }
  }

  async function download() {
    if (!pages) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pages.forEach((p, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(p.dataUrl, "JPEG", 0, MARGIN_MM, PAGE_W_MM, p.heightMm);
      });
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert(labels.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={buildPreview}
        disabled={busy}
        className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-60"
      >
        {busy ? labels.busy : labels.open}
      </button>

      {pages &&
        createPortal(
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
        >
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 border-b border-gray-200">
            <p className="font-semibold text-gray-900">
              {labels.title}
              {pages.length > 1 && <span className="ml-2 text-sm font-normal text-gray-500">({pages.length})</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={download}
                className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium active:bg-brand-700"
              >
                {labels.download}
              </button>
              <button
                type="button"
                onClick={() => setPages(null)}
                className="h-10 px-4 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 active:bg-gray-100"
              >
                {labels.close}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pages.map((p, index) => (
              <div key={index} className="mx-auto w-full max-w-xl">
                {pages.length > 1 && <p className="mb-1 text-xs text-white/80">{index + 1} / {pages.length}</p>}
                {/* one A4 sheet; the picture sits at the same top margin it gets in the PDF */}
                <div className="relative w-full overflow-hidden bg-white shadow-lg" style={{ aspectRatio: `${PAGE_W_MM} / ${PAGE_H_MM}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.dataUrl}
                    alt={`${labels.title} ${index + 1}`}
                    className="absolute left-0 w-full h-auto"
                    style={{ top: `${(MARGIN_MM / PAGE_H_MM) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
