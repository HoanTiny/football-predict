"use client";

import { useEffect, useState } from "react";

/**
 * Banner cảnh báo khi mất mạng + báo "đã kết nối lại" khi online trở lại.
 * Dùng navigator.onLine + sự kiện online/offline (realtime của Supabase tự reconnect).
 */
export default function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOffline(true);
    }
    const goOffline = () => {
      setOffline(true);
      setJustBack(false);
    };
    const goOnline = () => {
      setOffline((wasOffline) => {
        if (wasOffline) {
          setJustBack(true);
          setTimeout(() => setJustBack(false), 2500);
        }
        return false;
      });
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline && !justBack) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "7px 12px",
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
        background: offline
          ? "linear-gradient(90deg, #b91c1c, #ef4444)"
          : "linear-gradient(90deg, #047857, #10b981)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#fff",
          opacity: offline ? 1 : 0.9,
          animation: offline ? "pulse 1.2s ease-in-out infinite" : "none",
        }}
      />
      {offline
        ? "Mất kết nối mạng — đang chờ kết nối lại…"
        : "Đã kết nối lại ✓"}
    </div>
  );
}
