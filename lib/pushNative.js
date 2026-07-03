"use client";

// Đăng ký push notification NATIVE (FCM) khi chạy trong app Capacitor.
// Khác hẳn PushToggle (Web Push/VAPID) — dùng cho bản Android/iOS đóng gói.
import { isNativeApp } from "./platform";

let lastToken = null;
let registered = false;

async function sendTokenToServer(token, accessToken) {
  try {
    await fetch("/api/push/fcm-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, accessToken: accessToken || null }),
    });
  } catch (e) {
    console.error("Không gửi được FCM token lên server:", e);
  }
}

/**
 * Xin quyền + lấy FCM token, gửi lên server (gắn user nếu có accessToken lúc đó).
 * Gọi 1 LẦN khi app khởi động (native only). An toàn khi gọi lại — tự bỏ qua nếu đã đăng ký.
 */
export async function registerNativePush(accessToken) {
  if (!isNativeApp() || registered) return;
  registered = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== "granted") return;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      lastToken = token.value;
      sendTokenToServer(token.value, accessToken);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Đăng ký FCM thất bại:", err);
    });
  } catch (e) {
    console.error("registerNativePush lỗi:", e);
  }
}

/**
 * Gắn lại token FCM đã có với user vừa đăng nhập/đăng xuất (không đăng ký lại từ đầu).
 * Gọi khi Supabase auth state đổi (SIGNED_IN/SIGNED_OUT) sau khi registerNativePush đã chạy.
 */
export async function reassociateNativePushUser(accessToken) {
  if (!isNativeApp() || !lastToken) return;
  await sendTokenToServer(lastToken, accessToken);
}
