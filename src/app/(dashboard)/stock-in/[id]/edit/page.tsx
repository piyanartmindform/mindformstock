import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EditStockInForm } from "./EditStockInForm";
import Link from "next/link";

async function getData(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_mf")
    .select("*, products_mf(name, model, unit)")
    .eq("id", id)
    .single();
  return data;
}

export default async function EditStockInPage({ params }: { params: { id: string } }) {
  const item = await getData(params.id);
  if (!item) notFound();

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <Link href={`/stock-in/${params.id}`} className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขรายการรับเข้า</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {item.products_mf?.name ?? "-"}
          {item.products_mf?.model && ` · ${item.products_mf.model}`}
        </p>
      </div>
      <EditStockInForm item={item} />
    </div>
  );
}
