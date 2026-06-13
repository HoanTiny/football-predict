"use client";

import { useEffect } from "react";

/** Đăng ký service worker để app cài được lên màn hình chính + offline cơ bản. */
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {}); // im lặng nếu trình duyệt không hỗ trợ / chặn
    };
    // Đăng ký sau khi tải xong để không tranh tài nguyên lúc khởi động.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
