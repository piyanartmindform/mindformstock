import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CategoryManager } from "./CategoryManager";

async function getCategories() {
  const supabase = createClient();
  const { data } = await supabase.from("categories_mf").select("*").order("name");
  return data ?? [];
}

async function getIsAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles_mf").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export default async function SettingsPage() {
  const [categories, isAdmin] = await Promise.all([getCategories(), getIsAdmin()]);
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า</h1>
      </div>
      {isAdmin && (
        <Link href="/settings/users">
          <Card className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">จัดการ User</span>
            <span className="text-gray-400">›</span>
          </Card>
        </Link>
      )}
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
