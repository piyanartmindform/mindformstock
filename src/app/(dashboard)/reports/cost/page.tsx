import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getCurrentUserRole } from "@/lib/auth";
import { getCostReport, baht } from "@/lib/queries/costReport";

export default async function CostReportPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/reports");

  const { groups, missing, totalValue, totalUnits } = await getCostReport();
  const costedCount = groups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <Link href="/reports" className="text-sm text-brand block mb-2">← รายงาน</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">สรุปต้นทุนสินค้า</h1>
          <Link
            href="/reports/cost/print"
            className="h-10 px-4 rounded-xl bg-brand text-white text-sm font-medium flex items-center gap-1.5"
          >
            <span>📄</span> ส่งออก PDF
          </Link>
        </div>
      </div>

      <Card>
        <p className="text-sm text-gray-500">มูลค่าสต็อกตามราคาต้นทุน</p>
        <p className="text-3xl font-bold text-brand mt-1">{baht(totalValue)}</p>
        <p className="text-xs text-gray-400 mt-1">
          {costedCount} รายการ · {totalUnits.toLocaleString("th-TH")} ชิ้นในสต็อก
        </p>
      </Card>

      {missing.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800">
            ยังไม่มีราคาต้นทุน {missing.length} รายการ (มีสต็อกแต่ไม่ถูกนับในมูลค่า)
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {missing.map((m) => (
              <li key={m.id}>
                <Link href={`/products/${m.id}/edit`} className="underline">
                  {m.name}{m.model ? ` · ${m.model}` : ""}
                </Link>{" "}
                <span className="text-amber-700">({m.stock} {m.unit})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {groups.map((g) => (
        <div key={g.category}>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold text-gray-900">{g.category}</h2>
            <p className="text-sm font-medium text-gray-700">{baht(g.value)}</p>
          </div>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <Card key={r.id} className="py-2.5">
                <div className="flex justify-between items-center gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.model ? `${r.model} · ` : ""}{baht(r.cost ?? 0)} × {r.stock} {r.unit}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{baht(r.value)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีสินค้าที่ใส่ราคาต้นทุน</p>
      )}
    </div>
  );
}
