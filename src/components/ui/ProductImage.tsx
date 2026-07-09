"use client";

import { useState } from "react";

export function ProductImage({ images, alt }: { images: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            onClick={() => setOpenIndex(i)}
            className="h-40 max-w-[70vw] rounded-2xl object-contain cursor-zoom-in shrink-0 bg-gray-50"
          />
        ))}
      </div>
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex]}
            alt={alt}
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
