import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { ProfileCard } from "./ProfileCard";
import { ChangePasswordForm } from "./ChangePasswordForm";

async function getProfile() {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from("profiles_mf").select("role, full_name").eq("id", user.id).single();
  return { email: user.email ?? "", full_name: data?.full_name ?? null, role: data?.role ?? "staff" };
}

export default async function ProfileSettingsPage() {
  const profile = await getProfile();
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <Link href="/settings" className="text-sm text-brand block mb-2">← กลับ</Link>
        <h1 className="text-xl font-bold text-gray-900">โปรไฟล์</h1>
      </div>
      {profile && <ProfileCard email={profile.email} fullName={profile.full_name} role={profile.role} />}
      <ChangePasswordForm />
    </div>
  );
}
