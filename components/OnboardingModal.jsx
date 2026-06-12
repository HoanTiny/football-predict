"use client";

import { useState } from "react";

/** FIFA 2026 × Premium Onboarding Modal */
export default function OnboardingModal({ onSubmit }) {
  const [name, setName] = useState("");
  const ok = name.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0B1735] border border-white/5 rounded-xl p-8 text-center shadow-2xl overflow-hidden">
        {/* Subtle top glow */}
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#334BFF]/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* Trophy */}
        <div className="relative z-10 text-5xl mb-4">🏆</div>

        {/* Title */}
        <div className="relative z-10 mb-6 space-y-1">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#334BFF]">
            Tiny Football 2026™
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase font-oswald">
            DỰ ĐOÁN & CHINH PHỤC
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Dự đoán tỉ số · Tích điểm · Leo BXH toàn cầu
          </p>
        </div>

        {/* Input */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok && onSubmit(name.trim())}
          placeholder="Nhập tên của bạn…"
          className="glass-input relative z-10 w-full px-4 py-3 text-center font-bold text-sm mb-4"
          autoFocus
        />

        {/* Chip gift */}
        <div className="relative z-10 rounded-lg px-4 py-3 mb-6 text-xs font-semibold bg-[#62F2C0]/10 border border-[#62F2C0]/25 text-[#62F2C0]">
          🎁 Nhận ngay <strong className="font-extrabold">5.000 💎</strong> chips miễn phí để bắt đầu!
        </div>

        {/* CTA */}
        <button
          onClick={() => ok && onSubmit(name.trim())}
          disabled={!ok}
          className="relative z-10 w-full py-3.5 rounded-lg font-bold text-sm btn-primary disabled:bg-slate-800 disabled:text-slate-500 disabled:border-white/5 disabled:cursor-not-allowed"
        >
          Vào chơi thôi! ⚽
        </button>
      </div>
    </div>
  );
}
