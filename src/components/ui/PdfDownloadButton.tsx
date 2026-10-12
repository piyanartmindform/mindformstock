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
  autoOpen = false,
}: {
  targetId: string;
  fileName: string;
  labels: PdfLabels;
  /** open the preview right after the page loads (used by the links on the round page) */
  autoOpen?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<PreviewPage[] | null>(null);

  useEffect(() => {
    if (!autoOpen) return;
    // let the images of the document start loading first
    const timer = setTimeout(() => buildPreview(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

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
      // html2canvas draws Thai text a few px lower than the browser does, so small pill badges
      // lose their text off the bottom edge: lift the text inside the pill (same pill height)
      clone.querySelectorAll<HTMLElement>("[data-pdf-badge]").forEach((el) => {
        el.style.paddingTop = "0px";
        el.style.paddingBottom = "5px";
        el.style.lineHeight = "14px";
      });
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

      // header row of every table: pages that continue a table repeat it at the top
      const tableHeads = Array.from(clone.querySelectorAll("table")).flatMap((table) => {
        const thead = table.querySelector("thead");
        if (!thead) return [];
        const h = thead.getBoundingClientRect();
        return [{ headTop: h.top - top, headBottom: h.bottom - top, tableBottom: table.getBoundingClientRect().bottom - top }];
      });

      // the document header (logo, company, title) is repeated at the top of every later page
      const letterEl = clone.querySelector("[data-pdf-letterhead]");
      const letter = letterEl
        ? { top: letterEl.getBoundingClientRect().top - top, bottom: letterEl.getBoundingClientRect().bottom - top }
        : null;
      const LETTER_GAP = 14; // css px of space between the repeated header and the page content

      const scale = Math.min(2.5, 1800 / width);
      const render = (options: { y?: number; height?: number }) =>
        html2canvas(clone, { scale, useCORS: true, backgroundColor: "#ffffff", logging: false, ...options });

      // One picture of the whole document is fastest, but a very long document makes a canvas
      // the browser cannot create (iPhone Safari is the tightest, about 16 million pixels). In
      // that case each page is rendered on its own from a cropped area.
      const whole = width * scale * totalH * scale <= 14_000_000;
      const wholeCanvas = whole ? await render({}) : null;

      // picture of a vertical range of the document (css px)
      const crop = async (from: number, to: number): Promise<HTMLCanvasElement> => {
        if (!wholeCanvas) return render({ y: from, height: to - from });
        const piece = document.createElement("canvas");
        piece.width = wholeCanvas.width;
        piece.height = Math.max(1, Math.round((to - from) * scale));
        const ctx = piece.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, piece.width, piece.height);
        ctx.drawImage(wholeCanvas, 0, Math.round(from * scale), wholeCanvas.width, piece.height, 0, 0, piece.width, piece.height);
        return piece;
      };

      const result: PreviewPage[] = [];
      let start = 0;
      while (start < totalH - 1) {
        // later pages repeat the document header; a page that starts inside a table also repeats
        // that table's header row
        const letterH = start > 0 && letter ? letter.bottom - letter.top + LETTER_GAP : 0;
        const head =
          start > 0 ? tableHeads.find((t) => start >= t.headBottom - 1 && start < t.tableBottom - 8) : undefined;
        const headH = head ? head.headBottom - head.headTop : 0;

        const limit = start + pageCapacity - letterH - headH;
        let cut = totalH;
        if (totalH > limit) {
          const fits = boundaries.filter((b) => b > start + 40 && b <= limit);
          cut = fits.length > 0 ? fits[fits.length - 1] : limit;
        }

        // stack: [document header] [gap] [table header row] [page content]
        const parts: { canvas?: HTMLCanvasElement; gapCssPx?: number }[] = [];
        if (letterH > 0 && letter) {
          parts.push({ canvas: await crop(letter.top, letter.bottom) });
          parts.push({ gapCssPx: LETTER_GAP });
        }
        if (head) parts.push({ canvas: await crop(head.headTop, head.headBottom) });
        parts.push({ canvas: await crop(start, cut) });

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = parts.find((x) => x.canvas)!.canvas!.width;
        pageCanvas.height = parts.reduce((n, x) => n + (x.canvas ? x.canvas.height : Math.round((x.gapCssPx ?? 0) * scale)), 0);
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        let y = 0;
        for (const part of parts) {
          if (part.canvas) {
            ctx.drawImage(part.canvas, 0, y);
            y += part.canvas.height;
          } else {
            y += Math.round((part.gapCssPx ?? 0) * scale);
          }
        }

        result.push({
          dataUrl: pageCanvas.toDataURL("image/jpeg", 0.92),
          heightMm: ((cut - start + letterH + headH) / width) * PAGE_W_MM,
        });
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
