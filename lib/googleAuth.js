"use client";

// Đăng nhập Google DÙNG CHUNG cho cả web lẫn app native (Capacitor).
//
// Trên web: redirect chuẩn như cũ (chuyển hẳn trang, Supabase tự đưa về lại app sau khi xong).
//
// Trên app native: KHÔNG thể dùng redirect thường vì Google chặn đăng nhập trong WebView nhúng
// ("disallowed_useragent"). Phải mở OAuth bằng trình duyệt trong-app riêng (@capacitor/browser —
// Custom Tabs/SFSafariViewController, không phải WebView của app) rồi bắt kết quả qua deep link
// custom scheme (vn.tinyfootball.app://auth-callback#access_token=...), thay vì để Supabase
// redirect thẳng về URL web như trước (đó là lý do "đăng nhập xong bị đưa ra web").
import { supabase } from "./supabase";
import { isNativeApp } from "./platform";

export const AUTH_CALLBACK_HOST = "auth-callback";
const NATIVE_REDIRECT = `vn.tinyfootball.app://${AUTH_CALLBACK_HOST}`;

export async function signInWithGoogle({ extraQuery = "" } = {}) {
  if (isNativeApp()) {
    const { Browser } = await import("@capacitor/browser");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_REDIRECT + extraQuery,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) await Browser.open({ url: data.url });
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname + extraQuery,
    },
  });
  if (error) throw error;
}

/**
 * Xử lý deep link trả về từ trình duyệt OAuth (vn.tinyfootball.app://auth-callback#access_token=…).
 * Gọi từ listener `appUrlOpen` — trả về true nếu URL này đúng là callback đăng nhập (đã xử lý).
 */
export async function handleGoogleAuthCallback(url) {
  if (!url.includes(`://${AUTH_CALLBACK_HOST}`)) return false;
  try {
    const hashIndex = url.indexOf("#");
    if (hashIndex !== -1) {
      const params = new URLSearchParams(url.slice(hashIndex + 1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  } finally {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
    } catch {
      /* trình duyệt có thể đã tự đóng — bỏ qua */
    }
  }
  return true;
}
