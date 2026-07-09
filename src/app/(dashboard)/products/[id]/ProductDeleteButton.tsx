"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`ลบสินค้า "${productName}"? ประวัติรับเข้า/ขายออกเดิมจะยังคงอยู่`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("products_mf").update({ is_active: false }).eq("id", productId);
    router.push("/products");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-500 underline mt-1 ml-3 disabled:opacity-50"
    >
      ลบ
    </button>
  );
}
