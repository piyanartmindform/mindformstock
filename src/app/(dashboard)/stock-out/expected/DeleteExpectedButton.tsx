"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteExpectedButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("ลบรายการที่รอส่งออกนี้? ลบแล้วกู้คืนไม่ได้")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("stock_out_expected_mf").delete().eq("id", id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border text-xs font-medium border-red-300 bg-white text-red-600 active:bg-red-50 disabled:opacity-50"
    >
      ลบ
    </button>
  );
}
