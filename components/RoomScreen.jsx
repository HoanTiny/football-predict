"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { createRoom, joinRoom } from "@/lib/roomApi";
import { LEAGUES } from "@/lib/leagues";

/** FIFA 2026 × Premium Room Screen with Supabase Auth integration */
export default function RoomScreen({
  initialCode,
  onJoined,
  onSolo,
  onExit,
  onCancel,
  session,
  pushToast,
}) {
  const [view, setView] = useState(initialCode ? "join" : "menu");
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wc2026_last_room_name");
      if (saved) return saved;

      const solo = localStorage.getItem("wc2026_active_player");
      if (solo) return solo;
    }
    return "";
  });
  const [code, setCode] = useState(initialCode || "");
  const [roomName, setRoomName] = useState("");
  const [leagueId, setLeagueId] = useState(77); // mặc định World Cup 2026
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Trạng thái Auth
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authTargetView, setAuthTargetView] = useState(null); // 'create' | 'join'

  const nameOk = name.trim().length >= 2;

  const sessionEmailRef = useRef(null);

  // Tự động thông báo khi nhận diện phiên đăng nhập hoạt động trên thiết bị
  useEffect(() => {
    if (
      session &&
      session.user?.email &&
      sessionEmailRef.current !== session.user.email
    ) {
      const isNewLogin = sessionEmailRef.current === null;
      sessionEmailRef.current = session.user.email;
      if (isNewLogin) {
        pushToast &&
          pushToast(`Đã nhận diện tài khoản: ${session.user.email} 🟢`, "info");
      }
    }
  }, [session, pushToast]);

  // Tự động chuyển view khi đăng nhập thành công
  useEffect(() => {
    if (session && view === "auth") {
      setView(authTargetView || "menu");
      pushToast &&
        pushToast(
          `Đăng nhập thành công! Tài khoản: ${session.user.email} 🎉`,
          "win",
        );
    }
  }, [session, view, authTargetView, pushToast]);

  // Tự động điền tên từ thông tin tài khoản nếu trống
  useEffect(() => {
    if (session && !name) {
      const metaName =
        session.user?.user_metadata?.full_name ||
        session.user?.user_metadata?.name;
      if (metaName) {
        setName(metaName);
      }
    }
  }, [session, name]);

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
        const { data: signUpData, error: authErr } = await supabase.auth.signUp(
          {
            email: email.trim(),
            password: password.trim(),
          },
        );
        if (authErr) throw authErr;

        // Nếu user đã tồn tại mà chưa confirm, Supabase trả về identities rỗng
        const alreadyExists =
          signUpData?.user &&
          Array.isArray(signUpData.user.identities) &&
          signUpData.user.identities.length === 0;

        if (alreadyExists) {
          throw new Error(
            "Email này đã được đăng ký. Hãy đăng nhập hoặc kiểm tra hộp thư để xác nhận tài khoản.",
          );
        }

        // session !== null → Supabase đã tắt email confirm, đăng nhập luôn
        if (signUpData?.session) {
          // onAuthStateChange sẽ tự bắt và chuyển view
          return;
        }

        // session === null → cần xác nhận email trước khi đăng nhập được
        setError(
          "✅ Đăng ký thành công! Tiny Football đã gửi email xác nhận tới " +
            email.trim() +
            ". Hãy mở email và nhấn link xác nhận, sau đó quay lại đăng nhập. " +
            "(Kiểm tra cả thư mục Spam nếu không thấy.)",
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
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            window.location.origin +
            window.location.pathname +
            (initialCode ? `?room=${initialCode}` : ""),
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
      if (view === "create") roomCode = await createRoom(roomName, leagueId);
      const me = await joinRoom(roomCode, name.trim(), session?.user?.id);

      // Lưu tên cuối cùng vào localStorage thiết bị
      localStorage.setItem("wc2026_last_room_name", name.trim());

      // Đồng bộ lưu tên vào Supabase user_metadata để ghi nhớ trên DB
      if (session) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: name.trim() },
          });
        } catch (authErr) {
          console.error("Lưu metadata thất bại:", authErr);
        }
      }

      onJoined(roomCode, me);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    menu: "Sống Cùng Bóng Đá",
    auth: authMode === "login" ? "Đăng nhập tài khoản" : "Đăng ký tài khoản",
    create: "Tạo phòng mới",
    join: "Vào phòng bạn bè",
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-[#08142D]">
      {/* Background spotlights & radial glows */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div className="w-[500px] h-[500px] bg-gradient-to-b from-[#334BFF]/20 to-transparent rounded-full blur-[120px] absolute -top-[250px] left-1/2 -translate-x-1/2" />
        <div className="w-[400px] h-[400px] bg-gradient-to-t from-[#62F2C0]/10 to-transparent rounded-full blur-[100px] absolute -bottom-[200px] left-1/2 -translate-x-1/2" />
      </div>

      {onExit && view === "menu" && (
        <button
          onClick={onExit}
          className="fixed top-4 left-4 z-20 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Trang chủ bóng đá
        </button>
      )}

      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-[#091124]/80 border border-white/[0.08] rounded-2xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Top reflective glow */}
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#334BFF]/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="h-56 w-full flex items-center justify-center relative mb-4">
          {/* Concentric rotating orbits */}
          <div className="trophy-orbit orbit-1 absolute" />
          <div className="trophy-orbit orbit-2 absolute" />

          <img
            src="/wc2026-emblem.png"
            alt="Tiny Football"
            className="h-44 w-auto object-contain z-10 drop-shadow-[0_8px_24px_rgba(245,197,24,0.35)]"
          />
        </div>

        <div className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#62F2C0] mb-1">
          Tiny Football 2026™
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-6 uppercase tracking-wider font-oswald bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {titles[view]}
        </h1>

        {/* Menu view */}
        {view === "menu" && (
          <div className="relative z-10 space-y-4">
            {session?.user?.email && (
              <div className="text-[10px] text-slate-400 font-semibold bg-white/[0.02] border border-white/5 rounded-xl py-2.5 px-3 flex items-center justify-between gap-2 mb-1 text-left">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    Tài khoản:{" "}
                    <strong className="text-white font-mono">
                      {session.user.email}
                    </strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const { supabase } = await import("@/lib/supabase");
                    await supabase.auth.signOut();
                  }}
                  className="text-red-400 hover:text-red-300 font-bold text-[9px] uppercase tracking-wider shrink-0 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            )}
            {supabaseReady ? (
              <>
                <button
                  onClick={handleCreateClick}
                  className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-[#2E44E8] to-[#334BFF] border border-[#334BFF]/50 hover:from-[#334BFF] hover:to-[#4d60ff] hover:shadow-[0_0_20px_rgba(51,75,255,0.3)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🆕</span> Tạo phòng thi đấu chung
                      </div>
                      <div className="text-[10px] text-white/70 font-medium mt-0.5">
                        Mời bạn bè tham gia phòng dự đoán điểm số
                      </div>
                    </div>
                    <span className="text-white/70 group-hover:translate-x-1 transition-transform duration-200 text-sm font-bold">
                      →
                    </span>
                  </div>
                </button>

                <button
                  onClick={handleJoinClick}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#62F2C0] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔑</span> Vào phòng bằng mã
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Nhập mã phòng đã được chia sẻ để tham gia
                      </div>
                    </div>
                    <span className="text-[#62F2C0] group-hover:translate-x-1 transition-transform duration-200 text-sm font-bold">
                      →
                    </span>
                  </div>
                </button>
              </>
            ) : (
              <div className="text-xs rounded-xl p-4 text-left bg-slate-900/40 border border-white/5 text-slate-400 font-medium">
                Chế độ phòng chưa bật: cần cấu hình NEXT_PUBLIC_SUPABASE_URL và
                NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </div>
            )}

            <button
              onClick={onSolo}
              className="w-full text-left p-4 rounded-xl bg-transparent border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🙋</span> Chơi cá nhân (Solo)
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Tự dự đoán tỉ số, lưu trữ cục bộ trên máy này
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform duration-200 text-sm font-bold">
                  →
                </span>
              </div>
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto pt-1 cursor-pointer"
              >
                ← Để sau, quay lại phòng hiện tại
              </button>
            )}
          </div>
        )}

        {/* Auth view */}
        {view === "auth" && (
          <form
            onSubmit={handleAuthSubmit}
            className="relative z-10 space-y-4 text-left"
          >
            {/* Tab selector */}
            <div className="flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl gap-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white shadow-[0_2px_12px_rgba(51,75,255,0.3)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white shadow-[0_2px_12px_rgba(51,75,255,0.3)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng ký
              </button>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200"
              />
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200"
              />
            </div>

            {error && (
              <div
                className={`text-xs font-medium rounded-lg p-2.5 mt-2 border ${
                  error.startsWith("✅")
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                    : "text-[#ff5a5a] bg-[#ff5a5a]/10 border-[#ff5a5a]/25"
                }`}
              >
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white border border-[#334BFF]/50 hover:from-[#334BFF] hover:to-[#4d60ff] hover:shadow-[0_4px_20px_rgba(51,75,255,0.3)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy
                  ? "Đang xử lý…"
                  : authMode === "login"
                    ? "Đăng nhập"
                    : "Đăng ký tài khoản"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-grow bg-white/5" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  Hoặc
                </span>
                <span className="h-px flex-grow bg-white/5" />
              </div>

              {/* Google login button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                className="w-full py-3.5 flex items-center justify-center gap-2.5 rounded-xl font-bold text-xs bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
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
                onClick={() => {
                  setView("menu");
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto text-center pt-2 cursor-pointer"
              >
                ← Quay lại
              </button>
            </div>
          </form>
        )}

        {/* Create / Join view */}
        {view !== "menu" && view !== "auth" && (
          <div className="relative z-10 space-y-4">
            {session?.user?.email && (
              <div className="text-[10px] text-slate-400 font-semibold bg-white/[0.02] border border-white/5 rounded-xl py-2.5 px-3 flex items-center justify-between gap-2 mb-1 text-left">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    Tài khoản:{" "}
                    <strong className="text-white font-mono">
                      {session.user.email}
                    </strong>
                  </span>
                </span>
                <span className="text-emerald-400 font-bold text-[9px] uppercase tracking-wider shrink-0">
                  Đã đăng nhập
                </span>
              </div>
            )}
            {view === "join" && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Mã phòng (VD: WC-X7K2)"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-center font-mono tracking-widest text-xs focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200"
                disabled={Boolean(initialCode)}
              />
            )}
            {view === "create" && (
              <>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">
                    Giải đấu cho phòng này
                  </label>
                  <select
                    value={leagueId}
                    onChange={(e) => setLeagueId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200 cursor-pointer"
                  >
                    {LEAGUES.map((l) => (
                      <option key={l.id} value={l.id} className="bg-[#08142D]">
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={40}
                  placeholder="Tên phòng (VD: Phòng công ty) — tuỳ chọn"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-center font-semibold text-xs placeholder-slate-600 focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200"
                />
              </>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Tên của bạn"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-center font-semibold text-xs focus:outline-none focus:border-[#334BFF] focus:bg-white/[0.05] focus:ring-1 focus:ring-[#334BFF] transition-all duration-200"
              autoFocus
            />
            <div className="rounded-xl px-4 py-3 text-xs font-semibold bg-[#62F2C0]/10 border border-[#62F2C0]/25 text-[#62F2C0] flex items-center justify-center gap-1.5">
              <span>🎁</span> Mỗi người nhận 5.000 💎 chips khi vào phòng!
            </div>
            {error && (
              <div className="text-xs text-[#ff5a5a] font-medium bg-[#ff5a5a]/10 border border-[#ff5a5a]/25 rounded-lg p-2.5">
                {error}
              </div>
            )}
            <button
              onClick={submit}
              disabled={!nameOk || (view === "join" && !code.trim()) || busy}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white border border-[#334BFF]/50 hover:from-[#334BFF] hover:to-[#4d60ff] hover:shadow-[0_4px_20px_rgba(51,75,255,0.3)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy
                ? "Đang vào phòng…"
                : view === "create"
                  ? "Tạo phòng & Vào chơi 🏟️"
                  : "Vào phòng ⚽"}
            </button>
            <button
              onClick={() => {
                setView("menu");
                setError(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors block mx-auto cursor-pointer"
            >
              ← Quay lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
