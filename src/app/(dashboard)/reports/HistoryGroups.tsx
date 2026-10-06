import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDateRange, formatDateShort } from "@/lib/utils";

type Kind = "in" | "out";

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  return src ? (
    <Image src={src} alt={alt} width={44} height={44} className="w-11 h-11 rounded-xl object-contain bg-gray-50 shrink-0" />
  ) : (
    <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-lg">📦</div>
  );
}

// rows arrive newest first, so a group keeps the position of its latest entry
export function HistoryGroups({ items, kind, limit }: { items: any[]; kind: Kind; limit?: number }) {
  const dateOf = (i: any) => (kind === "in" ? i.received_date : i.sold_date) as string;
  const subtitleOf = (i: any) =>
    kind === "in"
      ? i.supplier || "ไม่ระบุซัพพลายเออร์"
      : `${i.customer_name}${i.project_name ? ` · ${i.project_name}` : ""}`;

  const groups = new Map<string, any[]>();
  for (const i of items) {
    const key = `${i.product_id}|${subtitleOf(i)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }
  const list = Array.from(groups.values());
  const shown = limit ? list.slice(0, limit) : list;

  const sign = kind === "in" ? "+" : "-";
  const color = kind === "in" ? "text-green-600" : "text-red-500";
  const base = kind === "in" ? "/stock-in" : "/stock-out";

  return (
    <div className="space-y-2">
      {shown.map((rows) => {
        const first = rows[0];
        const product = first.products_mf;
        const total = rows.reduce((s, r) => s + r.quantity, 0);
        const dates = rows.map(dateOf).sort();
        const summary = (
          <div className="flex justify-between items-center gap-3 text-sm">
            <Thumb src={product?.image_urls?.[0]} alt={product?.name ?? ""} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{product?.name}</p>
              <p className="text-xs text-gray-500 truncate">{subtitleOf(first)}</p>
            </div>
            <div className="text-right ml-2 shrink-0">
              <p className={`${color} font-medium`}>
                {sign}{total} {product?.unit}
              </p>
              <p className="text-xs text-gray-500">
                {rows.length > 1 ? `${rows.length} ครั้ง · ` : ""}
                {rows.length > 1 ? formatDateRange(dates[0], dates[dates.length - 1]) : formatDateShort(dates[0])}
              </p>
            </div>
          </div>
        );

        if (rows.length === 1) {
          return (
            <Link key={first.id} href={`${base}/${first.id}`} className="block">
              <Card className="py-2.5 active:bg-gray-50">{summary}</Card>
            </Link>
          );
        }

        return (
          <Card key={first.id} className="py-2.5">
            <details className="group">
              <summary className="list-none cursor-pointer">{summary}</summary>
              <div className="mt-2 border-t border-gray-100 divide-y divide-gray-100">
                {rows.map((r) => (
                  <Link
                    key={r.id}
                    href={`${base}/${r.id}`}
                    className="flex justify-between items-center py-2 text-sm active:bg-gray-50"
                  >
                    <span className="text-gray-700">{formatDateShort(dateOf(r))}</span>
                    <span className={`${color} font-medium`}>
                      {sign}{r.quantity} {product?.unit}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
