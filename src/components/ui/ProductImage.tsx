"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductImage({ images, alt, compact = false }: { images: string[]; alt: string; compact?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`flex gap-2 overflow-x-auto ${compact ? "mb-3" : "mb-4"}`}>
        {images.map((src, i) => (
          <Image
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            width={280}
            height={160}
            onClick={() => setOpenIndex(i)}
            className={`${compact ? "h-32 max-w-[55vw] rounded-xl" : "h-40 max-w-[70vw] rounded-2xl"} w-auto object-contain cursor-zoom-in shrink-0 bg-gray-50`}
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
