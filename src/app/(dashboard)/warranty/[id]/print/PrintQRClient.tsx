"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function PrintQRClient({ item, warrantyUrl }: { item: any; warrantyUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, warrantyUrl, {
        width: 240,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [warrantyUrl]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Screen preview */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/warranty" className="text-sm text-brand">← กลับ</Link>
        <button
          onClick={() => window.print()}
          className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium"
        >
          🖨️ พิมพ์
        </button>
      </div>

      {/* Print area */}
      <div className="max-w-xs mx-auto">
        <div
          id="print-label"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col items-center gap-4"
        >
          {/* Header */}
          <div className="w-full flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
              M
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">MINDFORM</p>
              <p className="text-xs text-gray-400">การรับประกันสินค้า</p>
            </div>
          </div>

          {/* QR Code */}
          <canvas ref={canvasRef} className="rounded-xl" />

          {/* Product info */}
          <div className="w-full space-y-1 text-center">
            <p className="font-bold text-gray-900">{item.products_mf?.name ?? "-"}</p>
            {item.products_mf?.model && (
              <p className="text-sm text-gray-500">{item.products_mf.model}</p>
            )}
            {item.products_mf?.brand && (
              <p className="text-sm text-gray-400">{item.products_mf.brand}</p>
            )}
          </div>

          <div className="w-full space-y-2 text-sm border-t border-gray-100 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">ลูกค้า</span>
              <span className="font-medium text-right max-w-[60%] truncate">{item.customer_name}</span>
            </div>
            {item.project_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">โปรเจค</span>
                <span className="font-medium text-right max-w-[60%] truncate">{item.project_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">วันที่ซื้อ</span>
              <span className="font-medium">{formatDate(item.purchase_date)}</span>
            </div>
            {item.warranty_expires_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">ประกันถึง</span>
                <span className="font-medium text-green-600">{formatDate(item.warranty_expires_at)}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">สแกน QR เพื่อตรวจสอบสถานะประกัน</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          #print-label { box-shadow: none; border: 1px solid #e5e7eb; }
        }
      `}</style>
    </div>
  );
}
