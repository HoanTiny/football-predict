"use client";

import { useEffect } from "react";

/**
 * Modal xác nhận dùng chung — giao diện đồng bộ với app, khó bấm nhầm hơn
 * popup mặc định của trình duyệt (nút huỷ nổi bật, có thể đóng bằng ESC / nền).
 */
export default function ConfirmModal({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Đồng ý",
  cancelLabel = "Huỷ",
  icon = "⚠️",
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm glass-strong rounded-2xl p-6 shadow-xl relative overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        {message && (
          <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line mb-6">
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={
              danger
                ? "w-full py-3 rounded-lg text-sm font-bold transition-all bg-red-950/30 border border-red-900/50 text-red-300 hover:bg-red-950/50 cursor-pointer"
                : "btn-primary w-full py-3 rounded-lg text-sm font-bold cursor-pointer"
            }
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary w-full py-3 rounded-lg text-sm font-bold cursor-pointer"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
