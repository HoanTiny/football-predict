"use client";

import { useState, useMemo } from "react";
import {
  GROUPS, flagOf, flagImgOf, fmt,
  CHAMPION_STAGES, STAGE_MULTIPLIERS,
  getTeamTier, getChampionOdds,
} from "@/lib/constants";

const renderFlag = (name, sizeClass = "w-6 h-6", fontClass = "text-xl") => {
  const img = flagImgOf(name);
  if (img) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-white/10 shadow bg-white/10`}>
        <img src={img} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return <span className={`${fontClass} shrink-0`}>{flagOf(name)}</span>;
};

function detectCurrentStage(matches) {
  if (!matches?.length) return "GROUP_STAGE";
  const order = ["GROUP_STAGE", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
  for (const stage of order) {
    const sm = matches.filter((m) => m.stage === stage);
    if (sm.length > 0 && sm.some((m) => m.status !== "FINISHED")) return stage;
  }
  return "FINAL";
}

function PickRow({ pick }) {
  const stageInfo = CHAMPION_STAGES.find((s) => s.key === pick.stage);
  const isWon = pick.status === "won";
  const isLost = pick.status === "lost";
  
  const statusConfig = isWon
    ? { text: "Thắng 👑", bg: "bg-amber-500/15 border-amber-500/25 text-amber-400" }
    : isLost
      ? { text: "Thua ❌", bg: "bg-red-500/10 border-red-500/20 text-red-400" }
      : { text: "Đang chờ ⏳", bg: "bg-blue-500/15 border-blue-500/25 text-blue-400" };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border bg-white/[0.08] border-white/15 backdrop-blur-xl hover:border-white/10 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {renderFlag(pick.team, "w-8 h-8 border border-white/10 shadow-sm", "text-2xl")}
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate">{pick.team}</div>
          <div className="text-[9px] text-white/50 font-bold uppercase tracking-wider mt-0.5">
            {stageInfo?.label || "Vòng đấu"} · ×{pick.multiplier}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-3">
        <div>
          <div className="text-xs font-extrabold text-[#62F2C0] font-mono">💎 {fmt(pick.wager)}</div>
          {pick.status === "pending" && (
            <div className="text-[8px] text-white/50 font-bold uppercase tracking-wider mt-0.5">
              Nhận: +{fmt(Math.round(pick.wager * pick.multiplier))}
            </div>
          )}
          {isWon && <div className="text-[9px] text-amber-400 font-black mt-0.5">+{fmt(pick.payout)} 💎</div>}
          {isLost && <div className="text-[9px] text-red-400 font-bold mt-0.5">-{fmt(pick.wager)} 💎</div>}
        </div>
        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${statusConfig.bg}`}>
          {statusConfig.text}
        </span>
      </div>
    </div>
  );
}

export default function ChampionTab({ player, onPlaceBet, roomChampions, matches }) {
  const currentStage = useMemo(() => detectCurrentStage(matches), [matches]);
  const [team, setTeam] = useState(null);
  const [wager, setWager] = useState(100);
  const [groupFilter, setGroupFilter] = useState("ALL");

  const picks = player.championPicks || [];
  const stagePick = picks.find((p) => p.stage === currentStage);
  const stageMult = STAGE_MULTIPLIERS[currentStage] || 2;
  const combinedOdds = team ? getChampionOdds(currentStage, team) : null;
  const stageInfo = CHAMPION_STAGES.find((s) => s.key === currentStage);

  return (
    <div className="space-y-6 pb-36">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#334BFF]">
          Dự đoán đặc biệt
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
          <span>🏆</span> Ai sẽ vô địch?
        </h2>
        <p className="text-[11px] text-white/60 font-medium max-w-md mx-auto leading-relaxed">
          Cược 1 lần mỗi vòng · Cược sớm hệ số cao hơn · Đội yếu hơn hệ số cao hơn
        </p>
      </div>

      {/* My picks summary */}
      {picks.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5">
            <span>👑</span> Cược của tôi ({picks.length}/6)
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {picks.map((p, i) => (
              <PickRow key={i} pick={p} />
            ))}
          </div>
        </div>
      )}

      {/* Rules card / multiplier guide */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl rounded-2xl p-4.5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Vòng hiện tại: <span className="text-[#7b8fff]">{stageInfo?.label}</span></span>
          </div>
          <span className="text-[10px] font-black text-[#62F2C0] uppercase tracking-wider">Hệ số vòng: ×{stageMult}</span>
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
          {[
            { stars: "⭐⭐⭐⭐⭐", label: "Top FIFA", mult: 1 },
            { stars: "⭐⭐⭐⭐", label: "Đội mạnh", mult: 1.5 },
            { stars: "⭐⭐⭐", label: "Trung bình", mult: 2 },
            { stars: "⭐⭐", label: "Ngựa ô", mult: 3 },
          ].map((tier) => (
            <div key={tier.label} className="bg-white/[0.06] rounded-xl p-2.5 text-center border border-white/10 flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] tracking-tighter leading-none select-none text-amber-500/80">{tier.stars}</span>
              <span className="text-[9px] text-white/60 font-bold whitespace-nowrap">{tier.label}</span>
              <span className="text-xs font-black text-white">×{stageMult * tier.mult}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Already bet on this stage card */}
      {stagePick ? (
        <div className="rounded-2xl p-8 text-center relative overflow-hidden bg-gradient-to-br from-[#10204A] to-[#0B1735] border border-amber-500/20 shadow-2xl">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4 max-w-xs mx-auto">
            <div className="text-[10px] text-amber-500 font-extrabold uppercase tracking-[0.25em]">
              Bạn đã chốt đội vô địch từ {stageInfo?.label}
            </div>
            
            <div className="relative flex justify-center py-2">
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
              {renderFlag(stagePick.team, "w-16 h-16 border-2 border-amber-500/30 shadow-2xl relative z-10", "text-5xl")}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white uppercase tracking-wider">{stagePick.team}</h3>
              <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/20 uppercase tracking-wider">
                Đã đặt cược 🔒
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block mb-1">Cược</span>
                <span className="text-sm font-extrabold text-[#62F2C0]">💎 {fmt(stagePick.wager)}</span>
              </div>
              <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block mb-1">Tỷ lệ nhân</span>
                <span className="text-sm font-extrabold text-white">×{stagePick.multiplier}</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              {stagePick.status === "pending" ? (
                <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-xl py-2 px-4">
                  ⏳ Thắng nhận: <strong className="text-emerald-300 font-extrabold">+{fmt(Math.round(stagePick.wager * stagePick.multiplier))} 💎</strong>
                </div>
              ) : stagePick.status === "won" ? (
                <div className="text-xs font-semibold text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-xl py-2 px-4">
                  👑 THẮNG THƯỞNG: <strong className="text-amber-300 font-extrabold">+{fmt(stagePick.payout)} 💎</strong>
                </div>
              ) : (
                <div className="text-xs font-semibold text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl py-2 px-4">
                  ❌ KHÔNG TRÚNG: <strong className="text-red-300 font-extrabold">-{fmt(stagePick.wager)} 💎</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Team Grid section */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Danh sách đội bóng</span>
            <span className="text-[10px] text-white/50 font-bold">Bấm để chọn đội cược</span>
          </div>

          {/* Quick Filter Bar by Group */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setGroupFilter("ALL")}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white/[0.08] text-white/60 border border-white/10 hover:text-white hover:bg-white/[0.14]"
              style={groupFilter === "ALL" ? { backgroundColor: "#334BFF", color: "#white" } : {}}
            >
              Tất cả
            </button>
            {Object.keys(GROUPS).map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className="shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer bg-white/[0.08] text-white/60 border border-white/10 hover:text-white hover:bg-white/[0.14]"
                style={groupFilter === g ? { backgroundColor: "#334BFF", color: "#white" } : {}}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Team Grid */}
          <div className="space-y-4.5">
            {Object.entries(GROUPS)
              .filter(([g]) => groupFilter === "ALL" || groupFilter === g)
              .map(([g, teams]) => (
                <div key={g} className="space-y-2">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF]/80 uppercase">
                    BẢNG {g}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {teams.map(([name]) => {
                      const odds = getChampionOdds(currentStage, name);
                      const tier = getTeamTier(name);
                      const sel = team === name;
                      const oddsColor =
                        tier === 1
                          ? "text-amber-400"
                          : tier === 2
                            ? "text-blue-400"
                            : tier === 3
                              ? "text-white/60"
                              : "text-white/50";
                      return (
                        <button
                          key={name}
                          onClick={() => setTeam(name)}
                          className={`rounded-xl p-3 text-left flex items-center gap-2.5 transition-all duration-200 border cursor-pointer ${
                            sel
                              ? "bg-[#334BFF]/15 border-[#334BFF] text-white shadow-[0_0_15px_rgba(51,75,255,0.25)] scale-[1.02]"
                              : "bg-white/[0.08] border-white/15 backdrop-blur-xl text-white/60 hover:bg-[#10204A] hover:border-[#334BFF]/30 hover:text-white hover:scale-[1.01]"
                          }`}
                        >
                          {renderFlag(name, "w-6 h-6 border border-white/10 shadow-sm", "text-xl")}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{name}</div>
                            <div className={`text-[10px] font-extrabold font-mono mt-0.5 ${sel ? "text-[#62F2C0]" : oddsColor}`}>
                              ×{odds}
                            </div>
                          </div>
                          {sel && (
                            <span className="w-4 h-4 rounded-full bg-[#62F2C0]/20 border border-[#62F2C0]/35 text-[#62F2C0] flex items-center justify-center text-[9px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Room friends' picks */}
      {roomChampions && roomChampions.filter((c) => c.name !== player.playerName).length > 0 && (
        <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 shadow-inner">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase mb-3.5 flex items-center gap-1.5">
            <span>👥</span> Bạn bè trong phòng đã chốt
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {roomChampions
              .filter((c) => c.name !== player.playerName)
              .map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/[0.05] border border-white/10 rounded-xl">
                  <span className="font-semibold text-white/75">{c.name}</span>
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    {renderFlag(c.team, "w-4 h-4 border border-white/10", "text-xs")}
                    <span>{c.team}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Floating Apple-style Sticky Bet Footer */}
      {!stagePick && team && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 mx-auto px-4 max-w-lg animate-slide-up">
          <div className="glass-strong rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Team display */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {renderFlag(team, "w-8 h-8 border border-white/10 shadow", "text-2xl")}
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-sm truncate leading-snug">{team}</div>
                  <div className="text-[9px] text-white/60 font-medium">
                    Nhân hệ số: <strong className="text-[#62F2C0] font-bold">×{combinedOdds}</strong>
                  </div>
                </div>
              </div>

              {/* Wager Input */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Cược:</span>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-[10px] pointer-events-none text-white/60">💎</span>
                  <input
                    type="number"
                    min="10"
                    value={wager || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setWager(isNaN(val) ? 0 : val);
                    }}
                    onBlur={() => {
                      setWager(Math.max(10, wager || 10));
                    }}
                    className="glass-input w-20 pl-6 pr-1.5 py-1 text-xs font-bold text-center text-white"
                  />
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => team && onPlaceBet(currentStage, team, wager, combinedOdds)}
                className="btn-primary px-5 py-2.5 text-xs font-bold shrink-0 shadow-[0_4px_12px_rgba(51,75,255,0.2)] cursor-pointer"
              >
                Chốt cược 👑
              </button>
            </div>

            {/* Payout preview */}
            <div className="flex justify-between items-center text-[10px] font-bold border-t border-white/10 pt-2.5">
              <span className="text-[#62F2C0] flex items-center gap-1">
                <span>🎯 Trúng nhận:</span>
                <span className="font-extrabold text-emerald-300">+{fmt(Math.round(wager * combinedOdds))} 💎</span>
              </span>
              <span className="text-white/50 font-medium">|</span>
              <span className="text-[#ff5a5a] flex items-center gap-1">
                <span>❌ Thua mất:</span>
                <span className="font-extrabold text-red-300">-{fmt(wager)} 💎</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
