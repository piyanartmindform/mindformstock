import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import { EditExpectedForm } from "./EditExpectedForm";

async function getExpected(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_in_expected_mf")
    .select("*, products_mf(name, model, unit)")
    .eq("id", id)
    .single();
  return data;
}

export default async function EditExpectedPage({ params }: { params: { id: string } }) {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/stock-in/expected");

  const expected = await getExpected(params.id);
  if (!expected) notFound();

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <div className="pt-2 mb-6">
        <a href="/stock-in/expected" className="text-sm text-brand block mb-2">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขรายการที่รอรับเข้า</h1>
      </div>
      <EditExpectedForm expected={expected} />
    </div>
  );
}
