import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles_mf")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  const { role, full_name } = await req.json();
  if (role && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
  }
  if (role === "staff" && params.id === admin.id) {
    return NextResponse.json({ error: "ไม่สามารถลด role ของตัวเองได้" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const update: Record<string, unknown> = {};
  if (role) update.role = role;
  if (full_name !== undefined) update.full_name = full_name || null;

  const { error } = await adminClient.from("profiles_mf").update(update).eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  if (params.id === admin.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  await adminClient.from("profiles_mf").delete().eq("id", params.id);
  const { error } = await adminClient.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
