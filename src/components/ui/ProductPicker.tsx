"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { groupProductsByCategory } from "@/lib/utils";

interface BaseProduct {
  id: string;
  name: string;
  model: string | null;
  image_urls?: string[] | null;
  categories_mf?: { name: string; sort_order?: number } | null;
}

interface ProductPickerProps<T extends BaseProduct> {
  label: string;
  products: T[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Extra line shown under the product name, e.g. current stock */
  renderExtra?: (product: T) => React.ReactNode;
}

export function ProductPicker<T extends BaseProduct>({
  label,
  products,
  value,
  onChange,
  required,
  disabled,
  placeholder = "-- เลือกสินค้า --",
  renderExtra,
}: ProductPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = products.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.model ?? "").toLowerCase().includes(q));
  }, [products, query]);

  const grouped = groupProductsByCategory(filtered);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && " *"}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
      >
        {selected?.image_urls?.[0] ? (
          <Image
            src={selected.image_urls[0]}
            alt={selected.name}
            width={80}
            height={56}
            className="h-12 w-auto max-w-16 rounded-lg object-contain shrink-0 bg-white"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-lg">📦</div>
        )}
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <p className="text-base text-gray-900 truncate">
                {selected.name}
                {selected.model ? ` (${selected.model})` : ""}
              </p>
              {renderExtra && <div className="text-sm text-gray-500">{renderExtra(selected)}</div>}
            </>
          ) : (
            <p className="text-base text-gray-400">{placeholder}</p>
          )}
        </div>
        {!disabled && (
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 shrink-0">
            <button type="button" onClick={() => setOpen(false)} className="p-1 text-gray-500" aria-label="ปิด">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex-1 overflow-y-auto pb-6">
            {grouped.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">ไม่พบสินค้า</p>
            ) : (
              grouped.map(({ category, items }) => (
                <div key={category}>
                  <p className="sticky top-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    {category}
                  </p>
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 active:bg-gray-50 ${
                        p.id === value ? "bg-brand/5" : ""
                      }`}
                    >
                      {p.image_urls?.[0] ? (
                        <Image
                          src={p.image_urls[0]}
                          alt={p.name}
                          width={64}
                          height={48}
                          className="h-12 w-auto max-w-16 rounded-lg object-contain shrink-0 bg-gray-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xl">📦</div>
                      )}
                      <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                        {p.name}
                        {p.model ? ` (${p.model})` : ""}
                      </span>
                      {p.id === value && (
                        <svg className="w-5 h-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
