import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getCostReport, baht } from "@/lib/queries/costReport";

function Chevron() {
  return (
    <svg
      className="w-5 h-5 text-gray-400 shrink-0 transition-transform group-open:rotate-180"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default async function CostReportPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/reports");

  const { groups, missing, totalValue, totalUnits } = await getCostReport();

  return (
    <div className="p-4 space-y-5 max-w-3xl mx-auto w-full">
      <div className="pt-2">
        <Link href="/reports" className="text-sm text-brand block mb-2">← รายงาน</Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">สรุปต้นทุนสินค้า</h1>
          <Link
            href="/reports/cost/print"
            className="h-12 px-4 rounded-xl bg-brand text-white text-sm font-medium flex items-center gap-1.5 shrink-0"
          >
            <span>📄</span> PDF
          </Link>
        </div>
      </div>

      {/* Headline number */}
      <div className="rounded-2xl bg-brand text-white p-5">
        <p className="text-sm text-white/80">มูลค่าสต็อกตามราคาต้นทุน</p>
        <p className="text-4xl font-bold mt-1 tracking-tight">{baht(totalValue)}</p>
        <p className="text-sm text-white/80 mt-2">
          {totalUnits.toLocaleString("th-TH")} ชิ้นในสต็อก · {groups.length} หมวดหมู่
        </p>
      </div>

      {/* Missing cost — compact, collapsed */}
      {missing.length > 0 && (
        <details className="group rounded-2xl border border-amber-300 bg-amber-50">
          <summary className="flex items-center justify-between gap-3 min-h-[56px] px-4 cursor-pointer list-none">
            <span className="text-sm font-semibold text-amber-900">
              ⚠️ ยังไม่มีต้นทุน {missing.length} รายการ
              <span className="block text-xs font-normal text-amber-700">มีสต็อกแต่ไม่ถูกนับในยอดรวม — แตะเพื่อดู</span>
            </span>
            <Chevron />
          </summary>
          <ul className="px-4 pb-3 divide-y divide-amber-200">
            {missing.map((m) => (
              <li key={m.id}>
                <Link href={`/products/${m.id}/edit`} className="flex items-center justify-between gap-3 min-h-[48px] text-sm text-amber-950">
                  <span className="truncate">{m.name}{m.model ? ` · ${m.model}` : ""}</span>
                  <span className="shrink-0 text-amber-700">{m.stock} {m.unit} ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {groups.map((g) => {
          const inStock = g.rows.filter((r) => r.stock > 0);
          const empty = g.rows.filter((r) => r.stock <= 0);
          const share = totalValue > 0 ? (g.value / totalValue) * 100 : 0;
          return (
            <details key={g.category} open className="group rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{g.category}</p>
                    <p className="text-xs text-gray-500">{inStock.length} รายการ · {share.toFixed(0)}% ของทั้งหมด</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-lg font-bold text-gray-900">{baht(g.value)}</p>
                    <Chevron />
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(share, 1)}%` }} />
                </div>
              </summary>

              <ul className="border-t border-gray-100 divide-y divide-gray-100">
                {inStock.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-base text-gray-900 truncate">{r.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {r.model ? `${r.model} · ` : ""}{r.stock} {r.unit} × {baht(r.cost ?? 0)}
                      </p>
                    </div>
                    <p className="text-base font-semibold text-gray-900 shrink-0">{baht(r.value)}</p>
                  </li>
                ))}
                {empty.length > 0 && (
                  <li className="px-4 py-2.5 text-sm text-gray-400">
                    สต็อก 0: {empty.map((r) => r.name + (r.model ? ` (${r.model})` : "")).join(", ")}
                  </li>
                )}
              </ul>
            </details>
          );
        })}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีสินค้าที่ใส่ราคาต้นทุน</p>
      )}
    </div>
  );
}
