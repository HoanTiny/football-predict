"use client";

import { useState } from "react";
import { fmt } from "@/lib/constants";
import AnimatedNumber from "./AnimatedNumber";
import Icon from "./Icon";

/** Floating Header — Subtle Glassmorphism, Clean Editorial Aesthetics */
export default function Header({
  player,
  _demoMode,
  _lastUpdated,
  tab,
  onTabChange,
  roomCode,
  sessions = [],
  activeCode = null,
  isSolo = false,
  onSwitchRoom,
  onGoSolo,
  onOpenRoomPicker,
  authSession,
  onExit,
  leagueId,
  _leagueName,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  // Tên phòng đang mở (nếu đã đặt) để hiển thị thay cho mã khô khan.
  const activeRoomName = sessions.find((s) => s.code === activeCode)?.roomName || null;

  // Bảng đấu/Sơ đồ/Vô địch hiện chỉ hỗ trợ đúng format World Cup 2026 (12 bảng, 48 đội,
  // vòng loại trực tiếp cố định) — ẩn với các giải khác để tránh hiện dữ liệu sai.
  const isWorldCup = leagueId === 77;
  const navTabs = [
    { key: "schedule", label: "Lịch đấu", icon: "calendar" },
    ...(isWorldCup ? [{ key: "groups", label: "Bảng đấu", icon: "table" }] : []),
    ...(isWorldCup ? [{ key: "bracket", label: "Sơ đồ", icon: "bracket" }] : []),
    { key: "predictions", label: "Lịch sử", icon: "history" },
    { key: "leaderboard", label: "BXH", icon: "chart" },
    ...(isWorldCup ? [{ key: "champion", label: "Vô địch", icon: "trophy" }] : []),
  ];

  const initial = (player.playerName || "?").charAt(0).toUpperCase();
  const settingsActive = tab === "settings";
  const statsActive = tab === "statistics";

  return (
    <>
      {/* Floating glass navbar */}
      <header
        className="fixed left-1/2 z-50 w-full max-w-7xl px-3"
        style={{
          // Cách top an toàn: 8px + phần status bar hệ thống che (Android/iOS). Trên web
          // (không có safe-area) env() trả 0px nên vẫn giữ đúng top-2 cũ.
          top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.18)] px-3.5 py-1.5 flex items-center justify-between gap-3 h-12"
        >
          {/* Left: Mobile Navigation Pill / Desktop Logo & Name */}
          <div className="flex items-center w-[40px] sm:w-[110px] md:w-[40px] lg:w-[180px] shrink-0">
            {/* Desktop Brand Identity: Logo + Name */}
            <div className="hidden md:flex items-center gap-2 select-none">
              <div className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden shadow-sm">
                <img
                  src="/logo.png"
                  alt="Tiny Sports"
                  className="h-5.5 w-auto object-contain"
                />
              </div>
              <span className="hidden lg:inline text-[11px] font-black tracking-[0.15em] leading-tight uppercase text-white whitespace-nowrap">
                Tiny Sports
              </span>
            </div>

            {/* Mobile: Home */}
            {onExit && (
              <button
                onClick={onExit}
                title="Về trang chủ bóng đá"
                className="md:hidden flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.18] transition-all duration-200 active:scale-95 z-10"
              >
                <Icon name="home" className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Middle: Desktop Navigation Pill */}
          <div className="hidden md:flex flex-1 justify-center min-w-0">
            <nav className="flex items-center gap-1 select-none">
              {onExit && (
                <>
                  <button
                    onClick={onExit}
                    title="Về trang chủ bóng đá"
                    className="flex w-7.5 h-7.5 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
                  >
                    <Icon name="home" className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-white/15 mx-1 shrink-0" />
                </>
              )}

              {navTabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => onTabChange(t.key)}
                    title={t.label}
                    className={`flex items-center justify-center px-3 rounded-full text-[10px] lg:text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all duration-200 h-7.5 cursor-pointer ${
                      active
                        ? "bg-white/15 text-white shadow-sm border border-white/10 scale-[1.01]"
                        : "text-white/60 hover:text-white hover:bg-white/5 hover:scale-[1.01]"
                    } active:scale-95`}
                  >
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Room code + Player profile */}
          <div className="flex items-center justify-end gap-2 w-[40px] sm:w-[110px] md:w-[40px] lg:w-[180px] shrink-0">
            {roomCode && (
              <span
                className="hidden sm:flex md:hidden lg:flex h-8 items-center gap-1.5 px-3 rounded-full text-[10px] font-bold tracking-[0.1em] text-[#F5D67A] bg-[#F5C518]/[0.12] border border-[#F5C518]/30 backdrop-blur-xl whitespace-nowrap max-w-[120px]"
                title={activeRoomName ? `${activeRoomName} · ${roomCode}` : "Mã phòng"}
              >
                <Icon name="users" className="w-3.5 h-3.5 shrink-0" />
                {activeRoomName ? (
                  <span className="truncate">{activeRoomName}</span>
                ) : (
                  <span className="font-mono tracking-[0.15em]">{roomCode}</span>
                )}
              </span>
            )}

            {/* Player profile button + dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`flex h-8.5 items-center gap-1.5 pl-1.5 pr-2.5 rounded-full bg-white/10 border backdrop-blur-xl transition-all duration-300 active:scale-95 ${
                  menuOpen || settingsActive || statsActive
                    ? "border-[#62F2C0]/50 bg-white/15 shadow-[0_0_12px_rgba(98,242,192,0.2)]"
                    : "border-white/15 hover:border-white/30 hover:bg-white/[0.16]"
                }`}
              >
                <div className="flex w-6 h-6 rounded-full border border-white/20 items-center justify-center overflow-hidden bg-gradient-to-tr from-[#334bff] to-[#62F2C0] text-[10px] font-black text-white uppercase select-none shadow-[0_2px_8px_rgba(98,242,192,0.2)]">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.playerName} className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="hidden sm:flex md:hidden lg:flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#62F2C0] tabular-nums">
                  <Icon name="gem" className="w-3 h-3 text-[#62F2C0] drop-shadow-[0_0_4px_rgba(98,242,192,0.4)]" />
                  <AnimatedNumber value={player.chips} />
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {menuOpen && (
                <>
                  {/* Click-outside backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  {/* Dropdown menu */}
                  <div
                    role="menu"
                    className="absolute right-0 mt-2.5 w-64 z-50 rounded-2xl bg-[#0b1735]/95 border border-white/20 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] p-2 origin-top-right animate-slide-up"
                  >
                    {/* Profile summary */}
                    <div className="px-3 py-3 border-b border-white/10 mb-1.5 bg-white/5 rounded-xl">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-tr from-[#334bff] to-[#62F2C0] select-none">
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.playerName} className="w-full h-full object-cover" />
                          ) : (
                            initial
                          )}
                        </div>
                        <span className="truncate">{player.playerName}</span>
                      </div>
                      <div className="text-[11px] text-[#62F2C0] font-bold tabular-nums mt-2 flex items-center gap-1.5">
                        <Icon name="gem" className="w-3.5 h-3.5 shrink-0 text-[#62F2C0]" />
                        {fmt(player.chips)} chips
                      </div>
                      {authSession?.user?.email && (
                        <div
                          className="text-[10px] text-white/50 truncate mt-2 flex items-center gap-1.5"
                          title={authSession.user.email}
                        >
                          <Icon name="mail" className="w-3 h-3 shrink-0 text-white/40" />
                          <span className="truncate">{authSession.user.email}</span>
                        </div>
                      )}
                      {roomCode && (
                        <div className="text-[10px] text-[#F5D67A] mt-2 flex items-center gap-1.5">
                          <Icon name="users" className="w-3 h-3 shrink-0 text-[#F5D67A]/60" />
                          {activeRoomName ? (
                            <span className="truncate">
                              {activeRoomName}{" "}
                              <span className="font-mono text-white/40">· {roomCode}</span>
                            </span>
                          ) : (
                            <span className="font-mono tracking-wider">Phòng {roomCode}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Room switcher */}
                    <div className="px-2.5 pt-2 pb-1 text-[9px] font-extrabold text-white/40 uppercase tracking-widest">
                      Phòng chơi
                    </div>
                    <button
                      role="menuitem"
                      onClick={() => {
                        onGoSolo && onGoSolo();
                        close();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        isSolo
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon name="user" className="w-4 h-4 shrink-0 text-white/60" />
                      Chơi một mình
                      {isSolo && (
                        <Icon name="check" className="ml-auto w-3.5 h-3.5 text-[#62F2C0]" />
                      )}
                    </button>
                    {sessions.map((s) => {
                      const active = !isSolo && s.code === activeCode;
                      return (
                        <button
                          key={s.code}
                          role="menuitem"
                          onClick={() => {
                            onSwitchRoom && onSwitchRoom(s.code);
                            close();
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            active
                              ? "bg-white/10 text-white shadow-sm"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon name="users" className="w-4 h-4 shrink-0 text-white/60" />
                          {s.roomName ? (
                            <span className="flex flex-col items-start min-w-0">
                              <span className="truncate max-w-[150px]">{s.roomName}</span>
                              <span className="font-mono tracking-wider text-[10px] text-white/40">
                                {s.code}
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono tracking-wider">{s.code}</span>
                          )}
                          {active && (
                            <Icon name="check" className="ml-auto w-3.5 h-3.5 text-[#62F2C0]" />
                          )}
                        </button>
                      );
                    })}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onOpenRoomPicker && onOpenRoomPicker();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#62F2C0] hover:bg-[#62F2C0]/10 transition-all duration-200 cursor-pointer"
                    >
                      <Icon name="plus" className="w-4 h-4 shrink-0 text-[#62F2C0]" />
                      Tạo / vào phòng khác
                    </button>

                    <div className="my-1.5 border-t border-white/10" />

                    {/* Stream / OBS */}
                    <a
                      href="/stream"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#62F2C0] hover:bg-[#62F2C0]/10 transition-all duration-200"
                    >
                      <Icon name="tv" className="w-4 h-4 shrink-0 text-[#62F2C0]" />
                      Stream / OBS
                    </a>

                    {/* Profile */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onTabChange("profile");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        tab === "profile"
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon name="user" className="w-4 h-4 shrink-0 text-white/60" />
                      Trang cá nhân
                    </button>

                    {/* Statistics */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onTabChange("statistics");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        statsActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon name="activity" className="w-4 h-4 shrink-0 text-white/60" />
                      Thống kê của tôi
                    </button>

                    {/* Settings */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onTabChange("settings");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        settingsActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon name="settings" className="w-4 h-4 shrink-0 text-white/60" />
                      Cài đặt & tài khoản
                    </button>
                    {authSession && (
                      <>
                        <div className="my-1.5 border-t border-white/10" />
                        <button
                          role="menuitem"
                          onClick={async () => {
                            const { supabase } = await import("@/lib/supabase");
                            await supabase.auth.signOut();
                            close();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#ff8a8a] hover:bg-[#ff5a5a]/15 hover:text-white transition-all duration-200 cursor-pointer"
                        >
                          <Icon name="logout" className="w-4 h-4 shrink-0" />
                          Đăng xuất tài khoản
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
