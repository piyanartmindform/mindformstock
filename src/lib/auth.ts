import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export const getAuthUser = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getCurrentUserRole = cache(async (): Promise<UserRole | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("role").eq("id", user.id).single();
  return (data?.role as UserRole | undefined) ?? null;
});
