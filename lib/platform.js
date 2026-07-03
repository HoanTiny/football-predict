"use client";

// Phát hiện app đang chạy trong shell Capacitor (Android/iOS đóng gói) hay trên trình duyệt
// web thường. Dùng để rẽ nhánh: push notification (FCM vs Web Push), share sheet, v.v.
// An toàn khi Capacitor chưa cài (web thuần) — luôn trả false, không throw.

let capacitorMod = null;

/**
 * Có đang chạy trong app Capacitor không (Android/iOS). false trên web/SSR.
 * Kiểm tra qua 2 kênh, OR lại — không phụ thuộc riêng cơ chế nào:
 *  1. `window.Capacitor.isNativePlatform()` — cách chuẩn, nhưng có thể chưa kịp inject
 *     (race) tại thời điểm component đầu tiên render.
 *  2. User-Agent marker "TinyFootballNativeApp" — gắn ở tầng NATIVE lúc tạo WebView
 *     (capacitor.config.json → android.appendUserAgent), có ngay từ request đầu tiên,
 *     không phụ thuộc JS bridge nên không bị race.
 */
export function isNativeApp() {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return typeof navigator !== "undefined" && navigator.userAgent.includes("TinyFootballNativeApp");
}

/** "android" | "ios" | "web". */
export function nativePlatform() {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() || "web";
}

/** Lazy-load @capacitor/core (tránh bundle nặng thêm khi chạy thuần web). */
export async function getCapacitor() {
  if (!isNativeApp()) return null;
  if (!capacitorMod) {
    capacitorMod = await import("@capacitor/core");
  }
  return capacitorMod.Capacitor;
}
