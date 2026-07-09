"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { href: "/customers", label: "รายชื่อลูกค้า", icon: "👥" },
  { href: "/warranty/register", label: "ลงทะเบียนประกัน", icon: "✍️" },
  { href: "/warranty/generate", label: "สร้าง QR Batch", icon: "🏷️" },
  { href: "/reports", label: "รายงาน", icon: "📊" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
  { href: "/settings/users", label: "จัดการ User", icon: "👤" },
];

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        aria-label="เมนู"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 w-full text-left"
            >
              <span>🚪</span>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
