"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Premium bottom navigation — mobile only with collapsible menu */
export default function BottomNav({ tab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Top 4 main tabs visible directly in the navigation bar
  const mainTabs = [
    { key: "home",        label: "Trang chủ", icon: "calendar" },
    { key: "schedule",    label: "Lịch",    icon: "calendar" },
    { key: "predictions", label: "Dự đoán", icon: "history" },
    { key: "leaderboard", label: "BXH",     icon: "chart" },
  ];

  // Hidden tabs collapsed into the "More" overlay menu
  const moreTabs = [
    { key: "groups",      label: "Bảng",    icon: "table" },
    { key: "bracket",     label: "Sơ đồ",   icon: "bracket" },
    { key: "statistics",  label: "Thống kê", icon: "activity" },
    { key: "champion",    label: "Vô địch", icon: "trophy" },
    { key: "settings",    label: "Cài đặt", icon: "settings" },
  ];

  const isMoreTabActive = moreTabs.some((t) => t.key === tab);

  return (
    <>
      {/* Backdrop overlay for closing the collapsible menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-200"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Collapsible More Menu Overlay */}
      {menuOpen && (
        <div className="fixed bottom-20 left-4 right-4 z-50 glass-strong border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-2 animate-slide-up md:hidden">
          <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-2 mb-1">
            Tính Năng Khác
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
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                    active
                      ? "bg-[#334BFF]/15 border-[#334BFF] text-[#62F2C0] shadow-[0_0_12px_rgba(51,75,255,0.15)] font-bold"
                      : "bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-900/60"
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

      {/* Symmetrical Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/5"
        style={{
          background: "rgba(8, 20, 45, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          height: "60px",
        }}
      >
        {/* Main tabs */}
        {mainTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                onTabChange(t.key);
                setMenuOpen(false); // Close menu if active tab shifts to main
              }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
              style={{
                color: active ? "#62F2C0" : "rgba(138, 160, 200, 0.5)",
              }}
            >
              <span
                className="transition-transform duration-200"
                style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
              >
                <Icon name={t.icon} className="w-5 h-5" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {t.label}
              </span>
            </button>
          );
        })}

        {/* Collapsible Menu Toggle Button (5th Tab) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
          style={{
            color: menuOpen || isMoreTabActive ? "#62F2C0" : "rgba(138, 160, 200, 0.5)",
          }}
        >
          <span
            className="transition-transform duration-200"
            style={{ transform: menuOpen || isMoreTabActive ? "scale(1.1)" : "scale(1)" }}
          >
            <Icon name="menu" className="w-5 h-5" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Thêm
          </span>
        </button>
      </nav>
    </>
  );
}
