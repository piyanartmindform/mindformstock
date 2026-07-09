"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/products", label: "สินค้า", icon: "📦" },
  { href: "/stock-in", label: "รับสินค้าเข้า", icon: "📥" },
  { href: "/stock-in/expected", label: "รายการที่รอรับเข้า", icon: "📋" },
  { href: "/stock-out", label: "ขายออก", icon: "🛒" },
  { href: "/stock-out/expected", label: "รายการที่รอส่งออก", icon: "📤" },
  { href: "/warranty", label: "QR / ประกัน", icon: "🔲" },
  { href: "/warranty/register", label: "ลงทะเบียนประกัน", icon: "✍️" },
  { href: "/warranty/generate", label: "สร้าง QR Batch", icon: "🏷️", adminOnly: true },
  { href: "/customers", label: "ลูกค้า", icon: "👥" },
  { href: "/reports", label: "รายงาน", icon: "📊" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
  { href: "/settings/users", label: "จัดการ User", icon: "👤" },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex w-56 flex-col bg-white border-r border-gray-200 min-h-screen">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <span className="font-semibold text-gray-900">MINDFORM Stock</span>
      </div>
      <nav className="flex-1 py-4 px-2">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
