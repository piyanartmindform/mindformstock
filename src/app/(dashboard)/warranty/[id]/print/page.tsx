import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, isWarrantyActive } from "@/lib/utils";
import { PrintQRClient } from "./PrintQRClient";

async function getWarrantyItem(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("warranty_items_mf")
    .select("*, products_mf(name, model, brand)")
    .eq("id", id)
    .single();
  return data;
}

export default async function PrintWarrantyPage({ params }: { params: { id: string } }) {
  const item = await getWarrantyItem(params.id);
  if (!item) notFound();

  const warrantyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/warranty/${item.id}`;

  return <PrintQRClient item={item} warrantyUrl={warrantyUrl} />;
}
