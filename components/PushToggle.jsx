"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Nút bật/tắt push notification. authSession (Supabase) để gắn thông báo đúng user. */
export default function PushToggle({ authSession }) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID_PUBLIC_KEY
    ) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Bạn chưa cho phép thông báo trong trình duyệt.");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          accessToken: authSession?.access_token || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi đăng ký");
      setSubscribed(true);
    } catch (e) {
      setError(e.message || "Không bật được thông báo");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e.message || "Không tắt được thông báo");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Trình duyệt này chưa hỗ trợ push notification (hoặc chưa cấu hình). Trên
        iOS cần cài app vào màn hình chính trước.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={busy}
        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
          subscribed
            ? "bg-[#62F2C0]/10 border border-[#62F2C0]/30 text-[#62F2C0] hover:bg-[#62F2C0]/20"
            : "btn-primary"
        }`}
      >
        {busy
          ? "Đang xử lý…"
          : subscribed
            ? "🔔 Đang bật thông báo — Bấm để tắt"
            : "🔔 Bật thông báo trận đấu"}
      </button>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Nhận thông báo: nhắc giờ trận bạn đã cược, bàn thắng trận đang đá, và kết
        quả thắng/thua kèo khi trận kết thúc.
      </p>
      {error && <p className="text-[10px] text-[#ff5a5a]">{error}</p>}
    </div>
  );
}
