"use client";

import { useState, useEffect } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { createRoom, joinRoom } from "@/lib/roomApi";

/** FIFA 2026 × Premium Room Screen with Supabase Auth integration */
export default function RoomScreen({ initialCode, onJoined, onSolo, onCancel, session }) {
  const [view, setView] = useState(initialCode ? "join" : "menu");
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Trạng thái Auth
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authTargetView, setAuthTargetView] = useState(null); // 'create' | 'join'

  const nameOk = name.trim().length >= 2;

  // Tự động chuyển view khi đăng nhập thành công
  useEffect(() => {
    if (session && view === "auth") {
      setView(authTargetView || "menu");
    }
  }, [session, view, authTargetView]);

  const handleCreateClick = () => {
    if (session) {
      setView("create");
    } else {
      setAuthTargetView("create");
      setView("auth");
    }
  };

  const handleJoinClick = () => {
    if (session) {
      setView("join");
    } else {
      setAuthTargetView("join");
      setView("auth");
    }
  };

  const handleAuthSubmit = async (e) => {
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
      } else {
        const { error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (authErr) throw authErr;
        setError("Đăng ký thành công! Hãy đăng nhập bằng tài khoản vừa tạo.");
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
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname + (initialCode ? `?room=${initialCode}` : ""),
        },
      });
      if (authErr) throw authErr;
    } catch (err) {
      setError(err.message || "Không thể đăng nhập Google.");
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!nameOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      let roomCode = code.trim().toUpperCase();
      if (view === "create") roomCode = await createRoom();
      const me = await joinRoom(roomCode, name.trim(), session?.user?.id);
      onJoined(roomCode, me);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    menu: "Chơi thế nào?",
    auth: authMode === "login" ? "Đăng nhập tài khoản" : "Đăng ký tài khoản",
    create: "Tạo phòng mới",
    join: "Vào phòng bạn bè",
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-[#08142D]">
      <div className="relative z-10 w-full max-w-md bg-[#0B1735] border border-white/5 rounded-xl p-8 text-center shadow-2xl overflow-hidden">
        {/* Subtle top glow */}
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#334BFF]/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 text-5xl mb-3">🏟️</div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#334BFF] mb-1">
          Tiny Football 2026™
        </div>
        <h1 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider font-oswald">
          {titles[view]}
        </h1>

        {/* Menu view */}
        {view === "menu" && (
          <div className="relative z-10 space-y-3">
            {supabaseReady ? (
              <>
                <button
                  onClick={handleCreateClick}
                  className="btn-primary w-full py-3.5 rounded-lg font-bold text-xs"
                >
                  🆕 Tạo phòng — mời bạn bè đấu chung
                </button>
                <button
                  onClick={handleJoinClick}
                  className="w-full py-3.5 rounded-lg font-bold text-xs bg-[#62F2C0]/10 border border-[#62F2C0]/25 text-[#62F2C0] hover:bg-[#62F2C0]/20 hover:border-[#62F2C0]/40 transition-all duration-200"
                >
                  🔑 Vào phòng bằng mã
                </button>
              </>
            ) : (
              <div className="text-xs rounded-xl p-4 text-left bg-slate-900/40 border border-white/5 text-slate-400 font-medium">
                Chế độ phòng chưa bật: cần cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </div>
            )}
            <button
              onClick={onSolo}
              className="btn-secondary w-full py-3.5 rounded-lg font-bold text-xs"
            >
              🙋 Chơi một mình (lưu trên máy này)
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto pt-1"
              >
                ← Để sau, quay lại phòng hiện tại
              </button>
            )}
          </div>
        )}

        {/* Auth view */}
        {view === "auth" && (
          <form onSubmit={handleAuthSubmit} className="relative z-10 space-y-4 text-left">
            {/* Tab selector */}
            <div className="flex bg-white/[0.03] border border-white/5 p-1 rounded-xl gap-1 mb-4">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  authMode === "login"
                    ? "bg-[#334BFF] text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  authMode === "signup"
                    ? "bg-[#334BFF] text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng ký
              </button>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="glass-input w-full px-4 py-2.5 text-xs text-left"
              />
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full px-4 py-2.5 text-xs text-left"
              />
            </div>

            {error && (
              <div className="text-xs text-[#ff5a5a] font-medium bg-[#ff5a5a]/10 border border-[#ff5a5a]/25 rounded-lg p-2.5 mt-2">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-lg font-bold text-xs btn-primary disabled:opacity-40"
              >
                {busy ? "Đang xử lý…" : authMode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-grow bg-white/5" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Hoặc</span>
                <span className="h-px flex-grow bg-white/5" />
              </div>

              {/* Google login button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                className="w-full py-3 flex items-center justify-center gap-2.5 rounded-lg font-bold text-xs bg-slate-900 border border-white/10 hover:bg-slate-800 transition-colors text-white"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Tiếp tục với Google
              </button>

              <button
                type="button"
                onClick={() => { setView("menu"); setError(null); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto text-center pt-2"
              >
                ← Quay lại
              </button>
            </div>
          </form>
        )}

        {/* Create / Join view */}
        {view !== "menu" && view !== "auth" && (
          <div className="relative z-10 space-y-4">
            {view === "join" && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Mã phòng (VD: WC-X7K2)"
                className="glass-input w-full px-4 py-3 text-center font-mono tracking-widest text-xs"
                disabled={Boolean(initialCode)}
              />
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Tên của bạn"
              className="glass-input w-full px-4 py-3 text-center font-semibold text-xs"
              autoFocus
            />
            <div className="rounded-lg px-4 py-3 text-xs font-semibold bg-[#62F2C0]/10 border border-[#62F2C0]/25 text-[#62F2C0]">
              🎁 Mỗi người nhận 5.000 💎 chips khi vào phòng!
            </div>
            {error && <div className="text-xs text-[#ff5a5a] font-medium">{error}</div>}
            <button
              onClick={submit}
              disabled={!nameOk || (view === "join" && !code.trim()) || busy}
              className="w-full py-3.5 rounded-lg font-bold text-xs btn-primary disabled:bg-slate-800 disabled:text-slate-500 disabled:border-white/5 disabled:cursor-not-allowed"
            >
              {busy ? "Đang vào phòng…" : view === "create" ? "Tạo phòng & Vào chơi 🏟️" : "Vào phòng ⚽"}
            </button>
            <button
              onClick={() => { setView("menu"); setError(null); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto"
            >
              ← Quay lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
