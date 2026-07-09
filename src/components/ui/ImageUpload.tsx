"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function ImageUpload({ value, onChange, max = 3 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { upsert: true });

    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(data.path);
      onChange([...value, urlData.publicUrl].slice(0, max));
    }
    setUploading(false);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">รูปสินค้า (สูงสุด {max} รูป)</label>
      <div className="flex gap-2">
        {Array.from({ length: max }).map((_, i) => {
          const url = value[i];
          const isNext = i === value.length;

          if (url) {
            return (
              <div key={i} className="relative w-24 h-24 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`รูปสินค้า ${i + 1}`} className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                  aria-label="ลบรูป"
                >
                  ✕
                </button>
              </div>
            );
          }

          if (isNext) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand hover:text-brand transition-colors"
              >
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">เพิ่มรูป</span>
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xs">กำลังอัปโหลด...</span>
                  </div>
                )}
              </button>
            );
          }

          return (
            <div key={i} className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50" />
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
