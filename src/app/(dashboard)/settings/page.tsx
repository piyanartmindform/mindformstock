import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserRole } from "@/lib/auth";

export default async function SettingsPage() {
  const role = await getCurrentUserRole();
  const isAdmin = role === "admin";

  const menuItems = [
    { href: "/settings/profile", label: "โปรไฟล์", icon: "👤" },
    { href: "/settings/categories", label: "หมวดหมู่สินค้า", icon: "🏷️" },
    ...(isAdmin ? [{ href: "/settings/users", label: "จัดการ User", icon: "👥" }] : []),
  ];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า</h1>
      </div>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
              </div>
              <span className="text-gray-400">›</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
