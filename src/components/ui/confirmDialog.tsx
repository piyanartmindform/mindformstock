"use client";

import { createRoot } from "react-dom/client";

// In-page replacement for window.confirm(): some browsers (in-app panes, PWAs) silently
// block native dialogs, which makes the confirm() call return false and the action do nothing.
export function confirmDialog(message: string, okLabel = "ยืนยัน"): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (answer: boolean) => {
      root.unmount();
      host.remove();
      resolve(answer);
    };
    root.render(
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
          <p className="text-base text-gray-900 break-words">{message}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => close(false)} className="h-12 rounded-xl border border-gray-300 bg-white text-base font-medium text-gray-700 active:bg-gray-100">
              ยกเลิก
            </button>
            <button type="button" autoFocus onClick={() => close(true)} className="h-12 rounded-xl bg-red-600 text-base font-medium text-white active:bg-red-700">
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    );
  });
}
