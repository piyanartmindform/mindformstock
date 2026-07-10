"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteExpectedButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("ลบรายการที่รอรับเข้านี้? ลบแล้วกู้คืนไม่ได้")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("stock_in_expected_mf").delete().eq("id", id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-500 underline px-1 disabled:opacity-50"
    >
      ลบ
    </button>
  );
}
