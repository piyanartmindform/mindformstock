"use client";

export function PrintButton({ label = "พิมพ์" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="h-10 px-5 bg-brand text-white rounded-xl text-sm font-medium"
    >
      {label}
    </button>
  );
}
