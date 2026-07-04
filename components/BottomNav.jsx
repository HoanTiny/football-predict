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
    { key: "profile",     label: "Hồ sơ", icon: "user" },
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
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-[28px] bg-[#0b1735]/95 border border-white/15 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] p-4 flex flex-col gap-2 animate-slide-up md:hidden">
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
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                    active
                      ? "bg-white/15 border-white/10 text-white font-bold shadow-sm"
                      : "bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon name={t.icon} className="w-4.5 h-4.5 shrink-0" />
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
        className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.18)] flex items-center gap-0.5 p-1.5 select-none"
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
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                active
                  ? "bg-white/15 border-white/10 text-white shadow-sm"
                  : "bg-transparent border-transparent text-white/60 hover:text-white"
              }`}
              style={{ minWidth: 56 }}
            >
              <Icon
                name={t.icon}
                className={`w-4.5 h-4.5 transition-transform duration-200 ${active ? "scale-105" : ""}`}
              />
              <span className="text-[8px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                {t.label}
              </span>
            </button>
          );
        })}

        {/* Nút "Thêm" */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
            menuOpen || isMoreTabActive
              ? "bg-white/15 border-white/10 text-white shadow-sm"
              : "bg-transparent border-transparent text-white/60 hover:text-white"
          }`}
          style={{ minWidth: 56 }}
        >
          <Icon
            name="menu"
            className={`w-4.5 h-4.5 transition-transform duration-200 ${menuOpen || isMoreTabActive ? "scale-105" : ""}`}
          />
          <span className="text-[8px] font-extrabold uppercase tracking-wider whitespace-nowrap">Thêm</span>
        </button>
      </nav>
    </>
  );
}
