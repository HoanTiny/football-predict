"use client";

import { useState } from "react";
import { GROUPS, flagOf, flagImgOf, fmt } from "@/lib/constants";

// Render team flags as circular images to avoid country codes on Windows
const renderTeamFlag = (teamName, sizeClass = "w-5 h-5", fontClass = "text-base") => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50`}>
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return <span className={`${fontClass} shrink-0`}>{flagOf(teamName)}</span>;
};

/** Room champions display */
function RoomChampions({ champions, myName }) {
  const others = (champions || []).filter((c) => c.name !== myName);
  if (others.length === 0) return null;
  return (
    <div className="max-w-md mx-auto mt-6 bg-slate-900/40 border border-white/5 rounded-2xl p-5">
      <h3 className="text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase mb-3.5">
        BẠN BÈ TRONG PHÒNG ĐÃ CHỐT
      </h3>
      <div className="space-y-2.5 text-xs">
        {others.map((c) => (
          <div key={c.name} className="flex items-center justify-between py-1">
            <span className="font-semibold text-slate-300">{c.name}</span>
            <div className="flex items-center gap-2 font-bold text-[#F5C518]">
              {renderTeamFlag(c.team, "w-4 h-4", "text-xs")}
              <span>{c.team}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** TAB 4 — Vô địch — flat team grid + gold champion section */
export default function ChampionTab({ player, onPlaceBet, roomChampions }) {
  const [team, setTeam] = useState(null);
  const [wager, setWager] = useState(50);

  // Already placed champion bet
  if (player.championPick) {
    const pick = player.championPick;
    const isWon = pick.status === "won";
    const isLost = pick.status === "lost";

    return (
      <div className="space-y-6">
        <div className="max-w-md mx-auto rounded-2xl p-8 text-center relative overflow-hidden bg-gradient-to-b from-[#10204A] to-[#0B1735] border border-amber-500/20 shadow-2xl">
          {/* Subtle gold glow (no heavy bloom) */}
          <div
            aria-hidden
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"
          />

          <div className="relative z-10 flex justify-center mb-4">
            {renderTeamFlag(pick.team, "w-16 h-16 border-2 border-[#F5C518]/30 shadow-2xl p-0.5 bg-slate-900/40", "text-5xl")}
          </div>
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1 relative z-10 text-amber-500/80">
            Dự đoán vô địch của bạn
          </div>
          <h2 className="text-2xl font-bold font-oswald relative z-10 mb-2 text-[#F5C518] tracking-wide">
            {pick.team.toUpperCase()}
          </h2>
          <p className="text-xs relative z-10 mb-5 text-slate-400">
            Đã cược: <strong className="text-[#62F2C0] font-bold">💎 {fmt(pick.wager)}</strong>
          </p>
          <div className="relative z-10 flex justify-center">
            {pick.status === "pending" ? (
              <span className="status-pill upcoming font-bold px-4 py-1.5 rounded-full text-xs">
                ⏳ Chờ chung kết · Trúng: +{fmt(pick.wager * 5)} 💎
              </span>
            ) : isWon ? (
              <span className="status-pill finished font-bold px-4 py-1.5 rounded-full text-xs">
                👑 THẮNG (+{fmt(pick.payout)} 💎)
              </span>
            ) : (
              <span className="status-pill live font-bold px-4 py-1.5 rounded-full text-xs">
                ❌ Không trúng (−{fmt(Math.abs(pick.payout))} 💎)
              </span>
            )}
          </div>
          <p className="text-[10px] relative z-10 mt-5 text-slate-500 font-medium">
            Mỗi người chơi chỉ được cược vô địch một lần.
          </p>
        </div>
        <RoomChampions champions={roomChampions} myName={player.playerName} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          Dự Đoán Đặc Biệt
        </div>
        <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">
          🏆 AI SẼ VÔ ĐỊCH?
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Chọn 1 trong 48 đội · Trúng nhận{" "}
          <span className="text-[#F5C518] font-bold">×5</span> số chip · Chỉ cược 1 lần
        </p>
      </div>

      {/* Team groups */}
      <div className="space-y-6 mb-32">
        {Object.entries(GROUPS).map(([g, teams]) => (
          <div key={g} className="space-y-2.5">
            <div className="text-[10px] font-bold tracking-[0.25em] text-[#334BFF] uppercase">
              BẢNG {g}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {teams.map(([name, flag]) => {
                const sel = team === name;
                return (
                  <button
                    key={name}
                    onClick={() => setTeam(name)}
                    className={`rounded-xl p-3 px-3.5 text-left flex items-center gap-3 transition-all duration-200 border ${
                      sel
                        ? "bg-[#334BFF]/15 border-[#334BFF] text-white shadow-[0_0_12px_rgba(51,75,255,0.15)]"
                        : "bg-[#0B1735] border-white/5 text-slate-400 hover:bg-[#10204A] hover:border-[#334BFF]/30 hover:text-white"
                    }`}
                  >
                    {renderTeamFlag(name, "w-6 h-6", "text-xl")}
                    <span className="text-xs font-bold truncate flex-1 tracking-wide">
                      {name}
                    </span>
                    {sel && <span className="text-[#62F2C0] text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bet footer */}
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-30 mx-auto px-4 max-w-[1024px]">
        <div className="glass-strong rounded-xl p-4 flex items-center gap-4 flex-wrap shadow-2xl">
          <div className="flex-1 min-w-[140px]">
            {team ? (
              <span className="font-bold text-white text-sm flex items-center gap-2.5">
                {renderTeamFlag(team, "w-6 h-6", "text-xl")}
                <span>{team}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Chọn một đội ở trên…
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 font-medium">
              Cược (10–500):
            </span>
            <input
              type="number"
              min="10"
              max="500"
              step="10"
              value={wager}
              onChange={(e) => setWager(Math.max(10, Math.min(500, parseInt(e.target.value || "10", 10) || 10)))}
              className="glass-input w-20 px-2.5 py-2 text-center font-bold text-xs"
            />
          </div>

          <button
            onClick={() => team && onPlaceBet(team, wager)}
            disabled={!team || wager > player.chips}
            className="px-6 py-2 rounded-lg font-bold text-xs btn-primary disabled:bg-slate-800 disabled:text-slate-500 disabled:border-white/5 disabled:cursor-not-allowed"
          >
            Chốt 👑
          </button>

          {team && (
            <div className="w-full text-center text-[10px] text-[#62F2C0] font-medium pt-1 border-t border-white/5">
              Trúng: +{fmt(wager * 5)} 💎 · Thua: −{fmt(wager)} 💎
            </div>
          )}
        </div>
      </div>

      <RoomChampions champions={roomChampions} myName={player.playerName} />
    </div>
  );
}
