"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}

export function CustomerCombobox({ name, label, defaultValue = "", required, placeholder = "ชื่อลูกค้า / บริษัท" }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [customers, setCustomers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const all = new Set<string>();

      // Source 1: customers_mf (managed list — may not exist yet)
      const { data: managed } = await supabase
        .from("customers_mf")
        .select("name")
        .order("name");
      (managed ?? []).forEach((r: any) => r.name && all.add(r.name));

      // Source 2: historical from stock_out
      const { data: fromSales } = await supabase
        .from("stock_out_mf")
        .select("customer_name")
        .not("customer_name", "is", null);
      (fromSales ?? []).forEach((r: any) => r.customer_name && all.add(r.customer_name));

      // Source 3: historical from warranty registrations
      const { data: fromWarranty } = await supabase
        .from("qr_codes_mf")
        .select("customer_name")
        .eq("status", "registered")
        .not("customer_name", "is", null);
      (fromWarranty ?? []).forEach((r: any) => r.customer_name && all.add(r.customer_name));

      setCustomers(Array.from(all).sort((a, b) => a.localeCompare(b, "th")));
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = value.trim()
    ? customers.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : customers;

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <label className="text-sm font-medium text-gray-700">
        {label}{required && " *"}
      </label>
      <div className="relative">
        <input
          name={name}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {filtered.map((c) => (
              <li
                key={c}
                onMouseDown={(e) => { e.preventDefault(); setValue(c); setOpen(false); }}
                className="px-4 py-3 text-sm text-gray-800 cursor-pointer hover:bg-brand/5 active:bg-brand/10 border-b border-gray-50 last:border-0"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
