import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles_mf").select("role").eq("id", user.id).single();
  return (data?.role as UserRole | undefined) ?? null;
}
