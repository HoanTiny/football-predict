"use client";

import { useState } from "react";
import { fmt, START_CHIPS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import PushToggle from "@/components/PushToggle";

function Section({ title, children }) {
  return (
    <div className="bg-[#0B1735] border border-white/5 rounded-xl p-5 space-y-4">
      <h3 className="text-[10px] font-bold tracking-[0.25em] text-[#334BFF] uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function PlayerNameEditor({ current, onSwitch }) {
  const [name, setName] = useState(current);
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="glass-input flex-1 px-3 py-2 text-xs font-semibold"
      />
      <button
        onClick={() =>
          name.trim().length >= 2 &&
          name.trim() !== current &&
          onSwitch(name.trim())
        }
        disabled={name.trim().length < 2 || name.trim() === current}
        className="px-4 py-2 rounded-lg font-bold text-xs btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Lưu
      </button>
    </div>
  );
}

function TokenEditor({ current, onSave }) {
  const [token, setToken] = useState(current);
  return (
    <div className="flex gap-2">
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="X-Auth-Token…"
        className="glass-input flex-1 px-3 py-2 text-xs font-mono"
      />
      <button
        onClick={() => token.trim() && onSave(token.trim())}
        disabled={!token.trim() || token.trim() === current}
        className="px-4 py-2 rounded-lg font-bold text-xs btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Lưu
      </button>
    </div>
  );
}

/** TAB 5 — Cài đặt — Compact editorial panels */
export default function SettingsTab({
  player,
  apiToken,
  demoMode,
  onSwitchPlayer,
  onSaveToken,
  onReset,
  onShare,
  roomCode,
  onLeaveRoom,
  authSession,
}) {
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Section title */}
      <div className="text-center mb-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          Tài khoản & Cài đặt
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          SETTINGS
        </h2>
      </div>

      {/* Auth Account section */}
      {authSession && (
        <Section title="TÀI KHOẢN">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Đã đăng nhập</span>
            <span className="font-bold text-white truncate max-w-[180px]">{authSession.user.email}</span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 hover:border-red-900/50 cursor-pointer"
          >
            🔌 Đăng xuất tài khoản
          </button>
        </Section>
      )}

      {/* Room section */}
      {roomCode && (
        <div className="bg-[#0B1735] border border-amber-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-bold tracking-[0.25em] text-amber-500 uppercase">
            PHÒNG CỦA BẠN
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Mã phòng</span>
            <span className="font-bold text-xl text-[#F5C518] font-mono tracking-wider">
              {roomCode}
            </span>
          </div>
          <button
            onClick={() => onLeaveRoom()}
            className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            🚪 Rời phòng
          </button>
        </div>
      )}

      {/* Player profile */}
      <Section title="NGƯỜI CHƠI">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs">
          <span className="text-slate-400 font-medium">Chế độ chơi</span>
          {roomCode ? (
            <span className="font-bold text-[#F5C518] flex items-center gap-1">
              🏟️ Phòng {roomCode} (Online)
            </span>
          ) : (
            <span className="font-bold text-[#62F2C0] flex items-center gap-1">
              🙋 Chơi cá nhân (Lưu cục bộ)
            </span>
          )}
        </div>

        {roomCode ? (
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="text-slate-400 font-medium">Tên trong phòng</span>
            <span className="font-bold text-white">{player.playerName}</span>
          </div>
        ) : (
          <div className="space-y-1.5 pb-1">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Tên hiển thị (đổi tên = chuyển hồ sơ khác)
            </label>
            <PlayerNameEditor
              current={player.playerName}
              onSwitch={onSwitchPlayer}
            />
          </div>
        )}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-slate-400 font-medium">Chips hiện tại</span>
          <span className="font-bold text-white">
            <span className="text-[#62F2C0] font-extrabold">
              💎 {fmt(player.chips)}
            </span>
            <span className="text-[10px] text-slate-500 font-normal ml-1.5">
              / {fmt(START_CHIPS)} ban đầu
            </span>
          </span>
        </div>
        {!roomCode && (
          <p className="text-[10px] text-slate-500 italic mt-2 leading-relaxed">
            * Hồ sơ chơi cá nhân được lưu trên trình duyệt của máy bạn. Khi đăng xuất tài khoản phòng chơi online, hệ thống sẽ khôi phục lại hồ sơ chơi đơn này.
          </p>
        )}
      </Section>

      {/* API token */}
      {/* <Section title="API FOOTBALL-DATA.ORG">
        <TokenEditor current={apiToken} onSave={onSaveToken} />
        <p className="text-[10px] text-slate-500 font-medium">
          API được gọi qua proxy server (/api/matches) — không bị chặn CORS.
        </p>
      </Section> */}

      {/* Push notifications */}
      <Section title="THÔNG BÁO">
        <PushToggle authSession={authSession} />
      </Section>

      {/* Actions */}
      <Section title="KHÁC">
        <button
          onClick={onShare}
          className="btn-primary w-full py-2.5 rounded-lg text-xs font-bold"
        >
          🔗 Sao chép link mời bạn bè
        </button>
        {demoMode ? (
          <button
            onClick={onReset}
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 hover:border-red-900/50"
          >
            🗑️ Xoá dự đoán & đặt lại chips
          </button>
        ) : (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-800/30 border border-white/5">
            <span className="text-sm leading-none mt-0.5">🔒</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Không thể xoá dự đoán & đặt lại chips khi chơi thật — để đảm bảo
              công bằng cho bảng xếp hạng. Chỉ khả dụng ở chế độ chơi thử.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}
