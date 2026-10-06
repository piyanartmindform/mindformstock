"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

export function ItemPhotos({
  deliveryId,
  itemId,
  photos,
  canEdit,
}: {
  deliveryId: string;
  itemId: string;
  photos: { path: string; url: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(paths: string[]) {
    const { error } = await createClient().from("delivery_items_mf").update({ image_paths: paths }).eq("id", itemId);
    return error;
  }

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 2 - photos.length);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const added: string[] = [];
      for (const f of files) {
        const path = `${deliveryId}/items/${itemId}-${Date.now()}-${added.length}.jpg`;
        const { error } = await supabase.storage
          .from("delivery-docs")
          .upload(path, await resizeImage(f), { contentType: "image/jpeg" });
        if (error) throw error;
        added.push(path);
      }
      const err = await save([...photos.map((p) => p.path), ...added]);
      if (err) throw err;
    } catch (err: any) {
      setError(err?.message ?? "แนบรูปไม่สำเร็จ");
    }
    setBusy(false);
    router.refresh();
  }

  async function remove(path: string) {
    if (!confirm("ลบรูปนี้?")) return;
    setBusy(true);
    const err = await save(photos.filter((p) => p.path !== path).map((p) => p.path));
    if (err) setError(err.message);
    else await createClient().storage.from("delivery-docs").remove([path]);
    setBusy(false);
    router.refresh();
  }

  if (photos.length === 0 && !canEdit) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        {photos.map((p) => (
          <div key={p.path} className="relative w-16 h-16">
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="รูปรายการ" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
            </a>
            {canEdit && (
              <button
                onClick={() => remove(p.path)}
                disabled={busy}
                aria-label="ลบรูป"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm leading-none flex items-center justify-center disabled:opacity-50"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {canEdit && photos.length < 2 && (
          <label className="h-16 px-3 rounded-lg border border-dashed border-gray-400 bg-white text-xs font-medium text-gray-700 flex items-center justify-center cursor-pointer active:bg-gray-100">
            📷 เพิ่มรูป ({photos.length}/2)
            <input type="file" accept="image/*" multiple className="hidden" onChange={add} disabled={busy} />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
