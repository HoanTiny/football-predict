"use client";

import { useState } from "react";

/** FIFA 2026 × Glass Config Screen — API token setup */
export default function ConfigScreen({ onSave, onDemo, onExit }) {
  const [token, setToken] = useState("");

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)" }}
    >
      {onExit && (
        <button
          onClick={onExit}
          className="fixed top-4 left-4 z-20 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Trang chủ bóng đá
        </button>
      )}
      {/* Blobs */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(51,75,255,0.2) 0%, transparent 70%), " +
          "radial-gradient(ellipse 50% 40% at 85% 80%, rgba(98,242,192,0.12) 0%, transparent 70%), " +
          "radial-gradient(ellipse 45% 35% at 70% 10%, rgba(111,0,255,0.12) 0%, transparent 65%)",
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className="glass-strong rounded-[32px] p-8 text-center overflow-hidden"
          style={{ boxShadow: "0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12) inset" }}
        >
          {/* Inner top glow */}
          <div aria-hidden style={{
            position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
            width: 300, height: 180,
            background: "radial-gradient(ellipse, rgba(51,75,255,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Logo */}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl mb-4"
              style={{ background: "linear-gradient(135deg, #334BFF 0%, #62F2C0 100%)", boxShadow: "0 8px 32px rgba(51,75,255,0.5)" }}
            >
              ⚽
            </div>
            <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-gradient mb-1" style={{ fontFamily: "var(--font-jakarta)" }}>
              Tiny Sports
            </div>
            <h1
              className="text-4xl font-black text-white"
              style={{ fontFamily: "var(--font-oswald), Oswald, sans-serif", letterSpacing: "0.05em" }}
            >
              PREDICT & WIN
            </h1>
            <p className="text-sm mt-2" style={{ color: "rgba(200,210,255,0.5)", fontFamily: "var(--font-jakarta)" }}>
              Kết nối dữ liệu realtime từ{" "}
              <a
                href="https://www.football-data.org/client/register"
                target="_blank" rel="noreferrer"
                className="text-[#62F2C0] underline underline-offset-2"
              >
                football-data.org
              </a>{" "}
              (miễn phí).
            </p>
          </div>

          {/* Token input */}
          <div className="relative z-10 mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-left" style={{ color: "rgba(200,210,255,0.4)", fontFamily: "var(--font-jakarta)" }}>
              API Token
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && token.trim() && onSave(token.trim())}
              placeholder="Dán X-Auth-Token vào đây…"
              className="glass-input w-full px-4 py-3.5 text-center font-mono text-sm"
              style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.04em" }}
            />
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => token.trim() && onSave(token.trim())}
            disabled={!token.trim()}
            className={`relative z-10 w-full py-4 rounded-2xl font-bold mb-3 ${token.trim() ? "btn-primary" : ""}`}
            style={{
              fontFamily: "var(--font-jakarta)",
              background: !token.trim() ? "rgba(255,255,255,0.06)" : undefined,
              color: !token.trim() ? "rgba(200,210,255,0.25)" : undefined,
              cursor: !token.trim() ? "not-allowed" : "pointer",
              border: !token.trim() ? "1px solid rgba(255,255,255,0.08)" : undefined,
            }}
          >
            Kết nối & Bắt đầu →
          </button>

          {/* Demo CTA */}
          <button
            onClick={onDemo}
            className="btn-secondary relative z-10 w-full py-4 rounded-2xl text-sm"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            🎮 Chơi thử với dữ liệu demo
          </button>
        </div>
      </div>
    </div>
  );
}
