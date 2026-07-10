import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate, isWarrantyActive } from "@/lib/utils";
import { CustomerDetailActions } from "./CustomerDetailActions";
import { BranchManager } from "./BranchManager";

export default async function CustomerDetailPage({ params }: { params: { name: string } }) {
  const customerName = decodeURIComponent(params.name);
  const supabase = createClient();

  const [warrantyRes, stockOutRes, customerRes] = await Promise.all([
    supabase
      .from("qr_codes_mf")
      .select("id, code, purchase_date, warranty_expires_at, warranty_months, project_name, products_mf(name, model)")
      .eq("status", "registered")
      .eq("customer_name", customerName)
      .order("purchase_date", { ascending: false }),
    supabase
      .from("stock_out_mf")
      .select("id, sold_date, quantity, project_name, products_mf(name, model, unit)")
      .eq("customer_name", customerName)
      .order("sold_date", { ascending: false }),
    supabase.from("customers_mf").select("id, name, notes").eq("name", customerName).maybeSingle(),
  ]);

  const warranties = warrantyRes.data ?? [];
  const stockOuts = stockOutRes.data ?? [];
  const customer = customerRes.data;

  const branches = customer
    ? (await supabase.from("customer_branches_mf").select("id, name").eq("customer_id", customer.id).order("name")).data ?? []
    : [];

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto w-full">
      <CustomerDetailActions
        customerName={customerName}
        warrantyCount={warranties.length}
        stockOutCount={stockOuts.length}
        customer={customer}
      />

      {customer && <BranchManager customerId={customer.id} initialBranches={branches} />}

      {/* Warranties */}
      {warranties.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">ประกันสินค้า</h2>
          <div className="space-y-2">
            {warranties.map((w: any) => {
              const active = w.warranty_expires_at ? isWarrantyActive(w.warranty_expires_at) : null;
              return (
                <a key={w.id} href={`/warranty/${w.code}`} target="_blank" rel="noopener noreferrer">
                  <Card className="py-3 active:scale-95 transition-transform">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-gray-400">{w.code}</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {w.products_mf?.name ?? "-"}
                          {w.products_mf?.model && <span className="text-gray-400 font-normal"> · {w.products_mf.model}</span>}
                        </p>
                        {w.project_name && <p className="text-xs text-gray-500">{w.project_name}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          ซื้อ {formatDate(w.purchase_date)}
                          {w.warranty_expires_at && ` · หมด ${formatDate(w.warranty_expires_at)}`}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {active === null ? (
                          <Badge variant="gray">ไม่มีประกัน</Badge>
                        ) : (
                          <Badge variant={active ? "success" : "danger"}>
                            {active ? "มีประกัน" : "หมดประกัน"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Out */}
      {stockOuts.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">ประวัติการซื้อ</h2>
          <div className="space-y-2">
            {stockOuts.map((s: any) => (
              <Link key={s.id} href={`/stock-out/${s.id}`}>
                <Card className="py-3 active:scale-95 transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {s.products_mf?.name ?? "-"}
                        {s.products_mf?.model && <span className="text-gray-400 font-normal"> · {s.products_mf.model}</span>}
                      </p>
                      {s.project_name && <p className="text-xs text-gray-500">{s.project_name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{s.quantity} {s.products_mf?.unit}</p>
                      <p className="text-xs text-gray-400">{formatDate(s.sold_date)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {warranties.length === 0 && stockOuts.length === 0 && (
        <p className="text-center text-gray-400 py-12">ไม่พบข้อมูล</p>
      )}
    </div>
  );
}
