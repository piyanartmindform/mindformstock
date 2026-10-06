"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, isWarrantyActive } from "@/lib/utils";

interface Item {
  id: string;
  code: string;
  status: string;
  customer_name?: string | null;
  project_name?: string | null;
  purchase_date?: string | null;
  warranty_expires_at?: string | null;
  products_mf?: { name: string; model: string | null } | null;
}

type ViewMode = "customer" | "product" | "recent";

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: "recent", label: "ล่าสุด" },
  { key: "customer", label: "ตามลูกค้า" },
  { key: "product", label: "ตามรุ่น" },
];

const NO_CUSTOMER = "ไม่ระบุลูกค้า";
const NO_PRODUCT = "ไม่ระบุสินค้า";

const customerOf = (i: Item) => i.customer_name || NO_CUSTOMER;
const projectOf = (i: Item) => i.project_name || "";
const productOf = (i: Item) =>
  i.products_mf ? `${i.products_mf.name}${i.products_mf.model ? ` · ${i.products_mf.model}` : ""}` : NO_PRODUCT;

// keeps the order items arrive in (newest first); sort groups afterwards where wanted
function groupBy<T>(items: T[], keyOf: (i: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const i of items) {
    const k = keyOf(i);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(i);
  }
  return map;
}

const byThai = (a: [string, unknown], b: [string, unknown]) => a[0].localeCompare(b[0], "th");

export function WarrantyList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("recent");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          (item.customer_name ?? "").toLowerCase().includes(q) ||
          (item.project_name ?? "").toLowerCase().includes(q) ||
          (item.products_mf?.name ?? "").toLowerCase().includes(q) ||
          (item.products_mf?.model ?? "").toLowerCase().includes(q)
      )
    : items;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหา รหัส QR / ชื่อลูกค้า / สินค้า..."
          className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* View mode tabs */}
      <div className="grid grid-cols-3 gap-2">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`h-10 rounded-xl text-sm font-medium transition-colors ${
              view === tab.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {query ? `พบ ${filtered.length} ชิ้น` : `ทั้งหมด ${filtered.length} ชิ้น`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔲</p>
          <p className="text-gray-500 text-sm">
            {query ? "ไม่พบรายการที่ตรงกัน" : "ยังไม่มีรายการลงทะเบียน"}
          </p>
        </div>
      ) : view === "recent" ? (
        <div className="space-y-2">
          {/* items arrive newest first, so each batch keeps the position of its latest registration */}
          {Array.from(groupBy(filtered, (i) => `${customerOf(i)}|${projectOf(i)}|${productOf(i)}`)).map(([key, rows]) => (
            <Card key={key} className="py-3">
              <p className="text-xs font-medium text-gray-600">
                {customerOf(rows[0])}
                {projectOf(rows[0]) && ` · ${projectOf(rows[0])}`}
              </p>
              <Line label={productOf(rows[0])} items={rows} />
            </Card>
          ))}
        </div>
      ) : view === "customer" ? (
        <div className="space-y-4">
          {Array.from(groupBy(filtered, customerOf)).sort(byThai).map(([customer, rows]) => {
            const projects = Array.from(groupBy(rows, projectOf)).sort(byThai);
            return (
              <Group key={customer} title={customer} count={rows.length}>
                {projects.map(([project, projectRows]) => (
                  <div key={project}>
                    {project && <p className="text-xs font-medium text-gray-600 mb-1">{project}</p>}
                    <div className="divide-y divide-gray-100">
                      {Array.from(groupBy(projectRows, productOf)).map(([product, lineRows]) => (
                        <Line key={product} label={product} items={lineRows} />
                      ))}
                    </div>
                  </div>
                ))}
              </Group>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupBy(filtered, productOf)).sort(byThai).map(([product, rows]) => (
            <Group key={product} title={product} count={rows.length}>
              <div className="divide-y divide-gray-100">
                {Array.from(groupBy(rows, (i) => `${customerOf(i)}${projectOf(i) ? ` · ${projectOf(i)}` : ""}`)).map(
                  ([who, lineRows]) => (
                    <Line key={who} label={who} items={lineRows} />
                  )
                )}
              </div>
            </Group>
          ))}
        </div>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
        <p className="font-semibold text-gray-900">{title}</p>
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{count} ชิ้น</span>
      </div>
      {children}
    </Card>
  );
}

function dateRange(values: string[]): string {
  if (values.length === 0) return "";
  const sorted = [...values].sort();
  const first = formatDate(sorted[0]);
  const last = formatDate(sorted[sorted.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

// one line = same product (or same customer/project) with a quantity; tap to see each QR code
function Line({ label, items }: { label: string; items: Item[] }) {
  const purchases = items.map((i) => i.purchase_date).filter((d): d is string => !!d);
  const expiries = items.map((i) => i.warranty_expires_at).filter((d): d is string => !!d);
  const states = items.map((i) => (i.warranty_expires_at ? isWarrantyActive(i.warranty_expires_at) : null));
  const covered = states.filter((s) => s !== null);
  const allActive = covered.length > 0 && covered.every(Boolean);
  const noneActive = covered.length > 0 && covered.every((s) => !s);

  return (
    <details className="py-2 group">
      <summary className="list-none cursor-pointer flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {label} <span className="text-gray-700">× {items.length}</span>
          </p>
          {purchases.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              ซื้อ {dateRange(purchases)}
              {expiries.length > 0 && ` · หมด ${dateRange(expiries)}`}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {covered.length === 0 ? (
            <Badge variant="gray">ไม่มีประกัน</Badge>
          ) : allActive ? (
            <Badge variant="success">มีประกัน</Badge>
          ) : noneActive ? (
            <Badge variant="danger">หมดประกัน</Badge>
          ) : (
            <Badge variant="warning">บางส่วนหมด</Badge>
          )}
          <svg className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>
      <p className="text-xs text-gray-500 mt-2">รหัส QR ({items.length})</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {items.map((i) => {
          const active = i.warranty_expires_at ? isWarrantyActive(i.warranty_expires_at) : null;
          return (
            <a
              key={i.id}
              href={`/warranty/${i.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono active:bg-gray-100 ${
                active === false ? "border-red-300 text-red-700 bg-red-50" : "border-gray-300 text-gray-700 bg-white"
              }`}
            >
              {i.code}
            </a>
          );
        })}
      </div>
    </details>
  );
}
