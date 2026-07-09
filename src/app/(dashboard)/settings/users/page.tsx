import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserManager } from "./UserManager";

export default async function UsersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles_mf")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "admin") {
    redirect("/settings");
  }

  const adminClient = createAdminClient();
  const { data: profiles } = await adminClient
    .from("profiles_mf")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? ""]));

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    role: p.role,
    full_name: p.full_name,
    created_at: p.created_at,
    email: emailById.get(p.id) ?? "",
  }));

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">จัดการ User</h1>
      </div>
      <UserManager initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
