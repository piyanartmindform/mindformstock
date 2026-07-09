"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

type SortOrder = "none" | "asc" | "desc";

export function ProductList({ products, categories }: { products: any[]; categories: Category[] }) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const filtered =
    categoryId === "all"
      ? products
      : products.filter((p) => p.category_id === categoryId);

  const sorted =
    sortOrder === "none"
      ? filtered
      : [...filtered].sort((a, b) =>
          sortOrder === "asc" ? a.current_stock - b.current_stock : b.current_stock - a.current_stock
        );

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryId("all")}
          className={`h-9 px-4 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 ${
            categoryId === "all" ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          ทั้งหมด
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`h-9 px-4 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 ${
              categoryId === c.id ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Sort by quantity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 shrink-0">จำนวนคงเหลือ:</span>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "none" : "asc")}
          className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
            sortOrder === "asc" ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          น้อย → มาก
        </button>
        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "none" : "desc")}
          className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
            sortOrder === "desc" ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          มาก → น้อย
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500">ไม่พบสินค้าในหมวดหมู่นี้</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => {
            const isLow = p.current_stock <= p.min_stock_level;
            return (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="flex items-center gap-3 active:scale-95 transition-transform">
                  {p.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_urls[0]} alt={p.name} className="h-14 max-w-20 rounded-xl object-contain shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-2xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      {p.model && (
                        <span className="text-xs text-gray-400">{p.model}</span>
                      )}
                    </div>
                    {p.brand && <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>}
                    {p.categories_mf?.name && (
                      <Badge variant="info" className="mt-1">{p.categories_mf.name}</Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${isLow ? "text-red-500" : "text-gray-900"}`}>
                      {p.current_stock}
                    </p>
                    <p className="text-xs text-gray-400">{p.unit}</p>
                    {isLow && <Badge variant="warning" className="mt-1">ใกล้หมด</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
