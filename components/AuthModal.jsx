"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/googleAuth";
import { useAuthSession } from "@/hooks/useAuthSession";

/**
 * Modal đăng nhập/đăng ký DÙNG CHUNG (cùng tài khoản Supabase với game Dự đoán) — dùng ở khu
 * duyệt trận cho tính năng "Đội của tôi" (đồng bộ theo tài khoản, không phải theo máy).
 */
export default function AuthModal({ onClose }) {
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Đăng nhập Google trên app native hoàn tất SAU khi trình duyệt trong-app đóng lại (không có
  // reload trang như trên web để "tự làm mới" modal) — tự đóng modal ngay khi phiên xuất hiện.
  const { session } = useAuthSession();
  const hadSession = useRef(Boolean(session));
  useEffect(() => {
    if (session && !hadSession.current) onClose();
    hadSession.current = Boolean(session);
  }, [session, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (authMode === "login") {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (authErr) throw authErr;
        onClose();
      } else {
        const { data: signUpData, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (authErr) throw authErr;
        const alreadyExists =
          signUpData?.user &&
          Array.isArray(signUpData.user.identities) &&
          signUpData.user.identities.length === 0;
        if (alreadyExists) {
          throw new Error("Email này đã được đăng ký. Hãy đăng nhập hoặc kiểm tra hộp thư để xác nhận tài khoản.");
        }
        if (signUpData?.session) {
          onClose();
          return;
        }
        setError(
          "✅ Đăng ký thành công! Kiểm tra email để xác nhận tài khoản, sau đó quay lại đăng nhập."
        );
        setAuthMode("login");
      }
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Không thể đăng nhập Google.");
    } finally {
      // Trên app native, đăng nhập hoàn tất sau khi trình duyệt trong-app đóng lại (deep link) —
      // không đợi ở đây được; onClose() được gọi từ nơi khác khi phiên đăng nhập xuất hiện.
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/20 shadow-2xl p-6 backdrop-blur-2xl bg-[#1c2064]/90"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>

        <h2 className="text-lg font-black text-white mb-1">
          {authMode === "login" ? "Đăng nhập" : "Đăng ký"}
        </h2>
        <p className="text-xs text-white/50 mb-5">
          Cần đăng nhập để đồng bộ "Đội của tôi" trên mọi thiết bị — dùng chung tài khoản với game Dự đoán.
        </p>

        <div className="flex bg-white/[0.06] border border-white/10 p-1 rounded-xl gap-1 mb-4">
          <button
            type="button"
            onClick={() => { setAuthMode("login"); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              authMode === "login" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("signup"); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              authMode === "signup" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-white text-xs placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-white text-xs placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
          />

          {error && (
            <div
              className={`text-xs font-medium rounded-lg p-2.5 border ${
                error.startsWith("✅")
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                  : "text-[#ff8a8a] bg-[#ff5a5a]/10 border-[#ff5a5a]/25"
              }`}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white disabled:opacity-40 transition-all"
          >
            {busy ? "Đang xử lý…" : authMode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-grow bg-white/10" />
            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Hoặc</span>
            <span className="h-px flex-grow bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="w-full py-3 flex items-center justify-center gap-2.5 rounded-xl font-bold text-xs bg-white/[0.06] border border-white/15 hover:bg-white/10 text-white disabled:opacity-40 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Tiếp tục với Google
          </button>
        </form>
      </div>
    </div>
  );
}
