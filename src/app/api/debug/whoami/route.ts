import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ loggedIn: false, userError: userError?.message });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles_mf")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    loggedIn: true,
    userId: user.id,
    email: user.email,
    profile,
    profileError: profileError?.message ?? null,
  });
}
