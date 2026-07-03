import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EditStockOutForm } from "./EditStockOutForm";
import Link from "next/link";

async function getData(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_out_mf")
    .select("*, products_mf(name, model, unit, current_stock)")
    .eq("id", id)
    .single();
  return data;
}

export default async function EditStockOutPage({ params }: { params: { id: string } }) {
  const item = await getData(params.id);
  if (!item) notFound();

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href="/stock-out" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขรายการขาย</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {item.products_mf?.name ?? "-"}
          {item.products_mf?.model && ` · ${item.products_mf.model}`}
        </p>
      </div>
      <EditStockOutForm item={item} />
    </div>
  );
}
