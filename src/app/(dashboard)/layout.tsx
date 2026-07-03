import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { BurgerMenu } from "@/components/layout/BurgerMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="print:hidden"><Sidebar /></div>
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 print:pb-0">
        {/* Mobile top bar */}
        <div className="md:hidden print:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-xs">M</div>
            <span className="font-semibold text-gray-900 text-sm">MINDFORM Stock</span>
          </div>
          <BurgerMenu />
        </div>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
