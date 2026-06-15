"use client";

import { useState } from "react";
import { pad } from "@/lib/time";
import { fmt } from "@/lib/constants";
import AnimatedNumber from "./AnimatedNumber";
import Icon from "./Icon";

/** Floating Header — Subtle Glassmorphism, Clean Editorial Aesthetics */
export default function Header({
  player,
  demoMode,
  lastUpdated,
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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const navTabs = [
    { key: "schedule", label: "Lịch đấu", icon: "calendar" },
    { key: "groups", label: "Bảng đấu", icon: "table" },
    { key: "bracket", label: "Sơ đồ", icon: "bracket" },
    { key: "predictions", label: "Lịch sử", icon: "history" },
    { key: "leaderboard", label: "BXH", icon: "chart" },
    { key: "champion", label: "Vô địch", icon: "trophy" },
  ];

  const initial = (player.playerName || "?").charAt(0).toUpperCase();
  const settingsActive = tab === "settings";
  const statsActive = tab === "statistics";

  return (
    <>
      {/* Floating glass navbar */}
      <header
        className="fixed top-4 left-1/2 z-50 w-full max-w-7xl px-4"
        style={{ transform: "translateX(-50%)" }}
      >
        <div
          className="glass-strong rounded-2xl pl-4 pr-3 py-2.5 flex items-center justify-between gap-4"
          style={{ minHeight: 64 }}
        >
          {/* Logo */}
          <button
            onClick={() => onTabChange("schedule")}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 overflow-hidden select-none">
              <img
                src="/wc2026-emblem.png"
                alt="Tiny Football"
                className="h-8 w-auto object-contain drop-shadow-[0_2px_6px_rgba(245,197,24,0.35)]"
              />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-[13px] font-extrabold tracking-[0.18em] leading-tight uppercase bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent whitespace-nowrap">
                Tiny Football
              </div>
              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 whitespace-nowrap">
                {demoMode ? (
                  <>🎮 Chế độ chơi thử</>
                ) : lastUpdated ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62F2C0] opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#62F2C0]" />
                    </span>
                    Cập nhật {pad(lastUpdated.getHours())}:
                    {pad(lastUpdated.getMinutes())}
                  </>
                ) : (
                  "Đang tải…"
                )}
              </div>
            </div>
          </button>

          {/* Desktop nav tabs — segmented pill (no scroll: labels collapse to icons below xl) */}
          <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {navTabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  title={t.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white shadow-[0_2px_12px_rgba(51,75,255,0.45)]"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon name={t.icon} className="w-4 h-4 shrink-0" />
                  <span className={active ? "inline" : "hidden xl:inline"}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right: room code + player profile (Stream moved into the dropdown) */}
          <div className="flex items-center gap-2 shrink-0">
            {roomCode && (
              <span
                className="hidden sm:flex h-9 items-center gap-1.5 px-3 rounded-xl text-[11px] font-bold font-mono tracking-[0.15em] text-[#F5C518] bg-[#F5C518]/[0.07] border border-[#F5C518]/25 whitespace-nowrap"
                title="Mã phòng"
              >
                <Icon name="users" className="w-3.5 h-3.5 shrink-0" />
                {roomCode}
              </span>
            )}

            {/* Player profile button + dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`flex h-9 items-center gap-2.5 pl-2.5 pr-2 rounded-xl bg-gradient-to-r from-[#334BFF]/15 to-[#62F2C0]/10 border transition-all duration-200 ${
                  menuOpen || settingsActive || statsActive
                    ? "border-[#62F2C0]/50 shadow-[0_0_14px_rgba(98,242,192,0.18)]"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="flex w-6 h-6 rounded-full bg-[#334BFF]/40 border border-white/15 items-center justify-center text-[10px] font-bold text-white uppercase select-none">
                  {initial}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-medium max-w-[90px] truncate">
                    {player.playerName}
                  </div>
                  <div className="text-xs font-bold text-[#62F2C0] tabular-nums flex items-center gap-1">
                    <Icon name="gem" className="w-3.5 h-3.5 shrink-0" />
                    <AnimatedNumber value={player.chips} />
                  </div>
                </div>
                <div className="sm:hidden text-xs font-bold text-[#62F2C0] tabular-nums flex items-center gap-1">
                  <Icon name="gem" className="w-3.5 h-3.5 shrink-0" />
                  <AnimatedNumber value={player.chips} />
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
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
                    className="absolute right-0 mt-2 w-60 z-50 rounded-xl glass-strong border border-white/10 shadow-2xl p-1.5 origin-top-right"
                  >
                    {/* Profile summary */}
                    <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                      <div className="text-xs font-bold text-white truncate">
                        {player.playerName}
                      </div>
                      <div className="text-[11px] text-[#62F2C0] font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
                        <Icon name="gem" className="w-3.5 h-3.5 shrink-0" />
                        {fmt(player.chips)} chips
                      </div>
                      {authSession?.user?.email && (
                        <div
                          className="text-[10px] text-slate-400 truncate mt-1.5 flex items-center gap-1.5"
                          title={authSession.user.email}
                        >
                          <Icon name="mail" className="w-3 h-3 shrink-0" />
                          <span className="truncate">{authSession.user.email}</span>
                        </div>
                      )}
                      {roomCode && (
                        <div className="text-[10px] text-[#F5C518] font-mono tracking-wider mt-1.5 flex items-center gap-1.5">
                          <Icon name="users" className="w-3 h-3 shrink-0" />
                          Phòng {roomCode}
                        </div>
                      )}
                    </div>

                    {/* Room switcher */}
                    <div className="px-2 pt-1 pb-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Phòng chơi
                    </div>
                    <button
                      role="menuitem"
                      onClick={() => {
                        onGoSolo && onGoSolo();
                        close();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isSolo
                          ? "bg-[#334BFF]/20 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon name="user" className="w-4 h-4 shrink-0" />
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
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[#334BFF]/20 text-white"
                              : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          <Icon name="users" className="w-4 h-4 shrink-0" />
                          <span className="font-mono tracking-wider">
                            {s.code}
                          </span>
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#62F2C0] hover:bg-white/[0.06] transition-colors"
                    >
                      <Icon name="plus" className="w-4 h-4 shrink-0" />
                      Tạo / vào phòng khác
                    </button>

                    <div className="my-1 border-t border-white/5" />

                    {/* Stream / OBS */}
                    <a
                      href="/stream"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#62F2C0] hover:bg-white/[0.06] transition-colors"
                    >
                      <Icon name="tv" className="w-4 h-4 shrink-0" />
                      Stream / OBS
                    </a>

                    {/* Statistics */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onTabChange("statistics");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        statsActive
                          ? "bg-[#334BFF]/20 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon name="activity" className="w-4 h-4 shrink-0" />
                      Thống kê của tôi
                    </button>

                    {/* Settings */}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onTabChange("settings");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        settingsActive
                          ? "bg-[#334BFF]/20 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon name="settings" className="w-4 h-4 shrink-0" />
                      Cài đặt & tài khoản
                    </button>
                    {authSession && (
                      <>
                        <div className="my-1 border-t border-white/5" />
                        <button
                          role="menuitem"
                          onClick={async () => {
                            const { supabase } = await import("@/lib/supabase");
                            await supabase.auth.signOut();
                            close();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer"
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
