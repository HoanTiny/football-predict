"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Floating glass bottom nav — mobile only, kiểu Apple Sports (pill nổi trên nền LiquidGlass). */
export default function BottomNav({ tab, onTabChange, leagueId }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Bảng đấu/Sơ đồ/Vô địch chỉ hỗ trợ đúng format World Cup 2026 — ẩn với giải khác.
  const isWorldCup = leagueId === 77;

  const mainTabs = [
    { key: "schedule",    label: "Lịch",    icon: "calendar" },
    ...(isWorldCup ? [{ key: "groups", label: "Bảng", icon: "table" }] : []),
    { key: "predictions", label: "Dự đoán", icon: "history" },
    { key: "leaderboard", label: "BXH",     icon: "chart" },
  ];

  const moreTabs = [
    ...(isWorldCup ? [{ key: "bracket", label: "Sơ đồ", icon: "bracket" }] : []),
    { key: "statistics",  label: "Thống kê", icon: "activity" },
    ...(isWorldCup ? [{ key: "champion", label: "Vô địch", icon: "trophy" }] : []),
    { key: "settings",    label: "Cài đặt", icon: "settings" },
  ];

  const isMoreTabActive = moreTabs.some((t) => t.key === tab);

  return (
    <>
      {/* Backdrop khi mở menu More */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-200"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Overlay "Tính năng khác" — glass */}
      {menuOpen && (
        <div className="fixed bottom-24 left-4 right-4 z-50 rounded-3xl bg-white/[0.14] border border-white/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_36px_rgba(0,0,0,0.35)] p-4 flex flex-col gap-2 animate-slide-up md:hidden">
          <div className="text-[9px] font-extrabold text-white/50 uppercase tracking-widest px-2 mb-1">
            Tính năng khác
          </div>
          <div className="grid grid-cols-2 gap-2">
            {moreTabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    onTabChange(t.key);
                    setMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border backdrop-blur-xl transition-colors text-left ${
                    active
                      ? "bg-white/25 border-white/30 text-white font-bold"
                      : "bg-white/[0.06] border-white/10 text-white/75 hover:bg-white/[0.14] hover:text-white"
                  }`}
                >
                  <Icon name={t.icon} className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider truncate">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating glass pill (không phải full-width bám đáy nữa) */}
      <nav
        className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 rounded-full bg-white/12 border border-white/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_28px_rgba(0,0,0,0.35)] flex items-center gap-1 p-1.5"
      >
        {mainTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                onTabChange(t.key);
                setMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-full transition-colors ${
                active
                  ? "bg-white/25 text-white"
                  : "text-white/60 hover:text-white/85"
              }`}
            >
              <Icon
                name={t.icon}
                className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {t.label}
              </span>
            </button>
          );
        })}

        {/* Nút "Thêm" */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-full transition-colors ${
            menuOpen || isMoreTabActive
              ? "bg-white/25 text-white"
              : "text-white/60 hover:text-white/85"
          }`}
        >
          <Icon
            name="menu"
            className={`w-5 h-5 transition-transform duration-200 ${menuOpen || isMoreTabActive ? "scale-110" : ""}`}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider">Thêm</span>
        </button>
      </nav>
    </>
  );
}
