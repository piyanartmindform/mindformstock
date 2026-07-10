"use client";

import { useEffect, useRef, useState } from "react";
import QrScannerLib from "qr-scanner";

interface QrScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

function extractCode(raw: string): string | null {
  // Try URL format: https://xxx/warranty/MF-00001
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Z]{1,8}-\d+$/i.test(last)) return last.toUpperCase();
  } catch {}
  // Direct code: MF-00001
  if (/^[A-Z]{1,8}-\d+$/i.test(raw.trim())) return raw.trim().toUpperCase();
  return null;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;
    let stopped = false;

    const scanner = new QrScannerLib(
      videoRef.current,
      (result) => {
        if (stopped) return;
        const code = extractCode(result.data);
        if (code) {
          stopped = true;
          setScanning(false);
          scanner.stop();
          onScan(code);
        }
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
      }
    );

    scanner.start().catch(() => {
      setError("ไม่สามารถเข้าถึงกล้องได้ — กรุณาอนุญาตการใช้กล้อง");
    });

    return () => {
      stopped = true;
      scanner.stop();
      scanner.destroy();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 text-white">
        <p className="font-semibold">สแกน QR สติ๊กเกอร์</p>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 active:bg-white/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-gray-900">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {/* Scan frame */}
          {!error && scanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-52 h-52">
                {/* Corner marks */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-lg" />
                {/* Scan line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-brand/70 animate-bounce top-1/2" />
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <p className="text-white text-center text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-white/50 text-center text-sm pb-8 px-4">
        จ่อกล้องไปที่สติ๊กเกอร์ QR บนสินค้า
      </p>
    </div>
  );
}
