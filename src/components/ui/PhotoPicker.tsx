"use client";

import { useEffect, useMemo } from "react";

// Pick up to `max` photos for one line. Files are held by the parent and uploaded on save.
export function PhotoPicker({
  files,
  onChange,
  max = 2,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {previews.map((url, i) => (
        <div key={url} className="relative w-16 h-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`รูปที่ ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            aria-label="ลบรูป"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm leading-none flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ))}
      {files.length < max && (
        <label className="h-16 px-3 rounded-lg border border-dashed border-gray-400 bg-white text-xs font-medium text-gray-700 flex items-center justify-center text-center cursor-pointer active:bg-gray-100">
          📷 เพิ่มรูป ({files.length}/{max})
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              onChange([...files, ...picked].slice(0, max));
            }}
          />
        </label>
      )}
    </div>
  );
}
