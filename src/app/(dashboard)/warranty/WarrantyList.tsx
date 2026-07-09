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

type ViewMode = "recent" | "product" | "customer";

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: "recent", label: "ล่าสุด" },
  { key: "product", label: "ตามรุ่น" },
  { key: "customer", label: "ตามลูกค้า" },
];

export function WarrantyList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("recent");

  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          (item.customer_name ?? "").toLowerCase().includes(q) ||
          (item.project_name ?? "").toLowerCase().includes(q) ||
          (item.products_mf?.name ?? "").toLowerCase().includes(q) ||
          (item.products_mf?.model ?? "").toLowerCase().includes(q)
        );
      })
    : items;

  // จัดกลุ่มตามรุ่นสินค้า / ชื่อลูกค้า (คงลำดับเดิมที่ sort มาจาก server คือล่าสุดก่อน)
  const groups: { key: string; items: Item[] }[] = [];
  if (view !== "recent") {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      const key =
        view === "product"
          ? item.products_mf?.name ?? "ไม่ระบุสินค้า"
          : item.customer_name ?? "ไม่ระบุลูกค้า";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    groups.push(
      ...Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "th"))
        .map(([key, items]) => ({ key, items }))
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              view === tab.key
                ? "bg-brand text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {query && (
        <p className="text-xs text-gray-400">พบ {filtered.length} รายการ</p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔲</p>
          <p className="text-gray-500 text-sm">
            {query ? "ไม่พบรายการที่ตรงกัน" : "ยังไม่มีรายการลงทะเบียน"}
          </p>
        </div>
      ) : view === "recent" ? (
        <div className="space-y-2">
          {filtered.map((item) => (
            <WarrantyCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <p className="text-sm font-semibold text-gray-900">{group.key}</p>
                <span className="text-xs text-gray-400">({group.items.length})</span>
              </div>
              {group.items.map((item) => (
                <WarrantyCard key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WarrantyCard({ item }: { item: Item }) {
  const active = item.warranty_expires_at
    ? isWarrantyActive(item.warranty_expires_at)
    : null;
  return (
    <a href={`/warranty/${item.code}`} target="_blank" rel="noopener noreferrer">
      <Card className="py-3 active:scale-95 transition-transform">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-gray-400 mb-0.5">{item.code}</p>
            <p className="font-medium text-gray-900 text-sm truncate">
              {item.products_mf?.name ?? item.customer_name ?? "-"}
              {item.products_mf?.model && (
                <span className="text-gray-400 font-normal"> · {item.products_mf.model}</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {item.customer_name}
              {item.project_name && ` · ${item.project_name}`}
            </p>
            {item.purchase_date && (
              <p className="text-xs text-gray-400 mt-0.5">
                ซื้อ {formatDate(item.purchase_date)}
                {item.warranty_expires_at && ` · หมด ${formatDate(item.warranty_expires_at)}`}
              </p>
            )}
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
}
