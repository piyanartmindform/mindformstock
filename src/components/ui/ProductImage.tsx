"use client";

import { useState } from "react";

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="w-40 h-40 object-cover rounded-2xl mb-4 mx-auto cursor-zoom-in"
      />
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
