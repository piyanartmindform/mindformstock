"use client";

import { useEffect } from "react";

export interface AlertInfo {
  title: string;
  message: string;
  /** extra lines under the message, e.g. who already used the code */
  details?: string[];
}

// Blocking pop-up for problems that must not be missed (e.g. a duplicate QR scan).
export function AlertDialog({ alert, onClose }: { alert: AlertInfo | null; onClose: () => void }) {
  useEffect(() => {
    if (alert && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  }, [alert]);

  if (!alert) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none" aria-hidden="true">⚠️</span>
          <div className="min-w-0">
            <h2 id="alert-title" className="text-lg font-bold text-red-700">{alert.title}</h2>
            <p className="text-base text-gray-900 mt-1 break-words">{alert.message}</p>
            {alert.details && alert.details.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
                {alert.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 w-full h-12 rounded-xl bg-brand text-white text-base font-medium active:bg-brand-700"
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
