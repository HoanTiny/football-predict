"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/constants";
import { allPlayers } from "@/lib/storage";

function PodiumPillar({ rank, player, isMe }) {
  const configs = {
    1: {
      color: "#F5C518",
      glow: "shadow-[0_0_30px_rgba(245,197,24,0.18)]",
      borderColor: "border-[#F5C518]/30",
      avatarBorder: "border-[#F5C518]",
      pillBg: "bg-gradient-to-t from-[#F5C518]/0 via-[#F5C518]/3 to-[#F5C518]/12",
      height: "h-[220px]",
      medal: "🥇",
      title: "QUÁN QUÂN",
      textColor: "text-[#F5C518]",
    },
    2: {
      color: "#94A3B8",
      glow: "shadow-[0_0_20px_rgba(148,163,184,0.12)]",
      borderColor: "border-slate-500/20",
      avatarBorder: "border-slate-400",
      pillBg: "bg-gradient-to-t from-slate-500/0 via-slate-500/3 to-slate-500/10",
      height: "h-[190px]",
      medal: "🥈",
      title: "Á QUÂN 1",
      textColor: "text-slate-300",
    },
    3: {
      color: "#F97316",
      glow: "shadow-[0_0_15px_rgba(249,115,22,0.08)]",
      borderColor: "border-[#F97316]/20",
      avatarBorder: "border-[#F97316]",
      pillBg: "bg-gradient-to-t from-[#F97316]/0 via-[#F97316]/3 to-[#F97316]/8",
      height: "h-[165px]",
      medal: "🥉",
      title: "Á QUÂN 2",
      textColor: "text-orange-400",
    },
  };

  const c = configs[rank];

  if (!player) {
    return (
      <div className={`flex flex-col items-center justify-end w-full ${c.height} opacity-20 select-none`}>
        {/* Placeholder Avatar */}
        <div className="w-10 h-10 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs mb-3">
          ?
        </div>
        {/* Pillar Stand */}
        <div className="w-full flex-grow max-h-[80px] bg-slate-800/10 border border-dashed border-slate-700/30 rounded-t-2xl flex items-center justify-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          TRỐNG
        </div>
      </div>
    );
  }

  const initials = player.name
    ? player.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className={`flex flex-col items-center justify-end w-full ${c.height} relative`}>
      {/* Player info floating on top */}
      <div className="flex flex-col items-center w-full z-10 text-center px-1 mb-2">
        <div className="text-xl mb-1 filter drop-shadow">{c.medal}</div>
        
        {/* Avatar circle */}
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs font-bold uppercase ${c.avatarBorder} border-2 bg-slate-900/90 text-white shadow-md relative`}>
          {initials}
          {isMe && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 bg-[#62F2C0] rounded-full border border-slate-950 items-center justify-center text-[8px] font-black text-slate-950">
              ME
            </span>
          )}
        </div>

        <div className="font-extrabold text-[11px] sm:text-xs text-white truncate max-w-full mt-2">
          {player.name}
          {isMe && <span className="ml-1 text-[9px] text-[#62F2C0] font-normal">(bạn)</span>}
        </div>
        
        <div className={`font-black text-xs sm:text-sm mt-0.5 ${c.textColor} tabular-nums`}>
          💎{fmt(player.chips)}
        </div>
      </div>

      {/* Actual pillar pedestal structure */}
      <div className={`w-full flex-grow max-h-[110px] rounded-t-2xl border-t border-x ${c.borderColor} ${c.pillBg} ${c.glow} relative overflow-hidden flex flex-col justify-end p-2.5`}>
        {/* Shine highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
        
        <div className="text-center w-full relative z-10">
          <div className="text-[14px] font-black text-white/20 tracking-tight leading-none uppercase">
            RANK {rank}
          </div>
          <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">
            {c.title}
          </div>
        </div>
      </div>
    </div>
  );
}

/** TAB 3 — BXH — Symmetrical list, editorial table */
export default function LeaderboardTab({ player, matches, roomLeaderboard }) {
  const localLeaderboard = useMemo(() => {
    return allPlayers()
      .map((p) => {
        const settled = (p.predictions || []).filter((x) => x.status !== "pending");
        const wins = settled.filter((x) => x.status !== "lost").length;
        return {
          name: p.playerName,
          chips: p.chips,
          total: (p.predictions || []).length,
          winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.chips - a.chips);
  }, [player, matches]);

  const leaderboard = roomLeaderboard || localLeaderboard;
  
  // Trích xuất thống kê người chơi hiện tại
  const stats = useMemo(() => {
    const idx = leaderboard.findIndex((p) => p.name === player.playerName);
    const myRank = idx !== -1 ? idx + 1 : "-";
    const totalPlayers = leaderboard.length;
    
    // Tính winRate của tôi
    const settled = (player.predictions || []).filter((x) => x.status !== "pending");
    const wins = settled.filter((x) => x.status !== "lost").length;
    const myWinRate = settled.length ? Math.round((wins / settled.length) * 100) : 0;

    return {
      rank: myRank,
      total: totalPlayers,
      winRate: myWinRate
    };
  }, [leaderboard, player]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Gán các vị trí
  const top1 = top3[0] || null;
  const top2 = top3[1] || null;
  const top3rd = top3[2] || null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Section title */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          BẢNG XẾP HẠNG
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider font-oswald">
          LEADERBOARD
        </h2>
      </div>

      {/* Bento Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3 bg-[#0B1735]/40 border border-white/5 rounded-xl p-3.5 text-center">
        <div>
          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            VỊ TRÍ CỦA BẠN
          </div>
          <div className="text-sm sm:text-base font-black text-white">
            #{stats.rank} <span className="text-[10px] text-slate-400 font-semibold">/ {stats.total}</span>
          </div>
        </div>
        <div className="border-x border-white/5">
          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            SỐ DƯ CHIPS
          </div>
          <div className="text-sm sm:text-base font-black text-[#62F2C0] tabular-nums">
            💎 {fmt(player.chips)}
          </div>
        </div>
        <div>
          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            TỈ LỆ THẮNG
          </div>
          <div className="text-sm sm:text-base font-black text-[#7b8fff] tabular-nums">
            {stats.winRate}%
          </div>
        </div>
      </div>

      {/* Podium Structure — top 3 side-by-side columns */}
      {top3.length > 0 && (
        <div className="bg-[#0B1735]/25 border border-white/[0.03] rounded-2xl p-6 shadow-inner max-w-lg mx-auto">
          <div className="flex gap-4 items-end justify-center">
            {/* 2nd place */}
            <div className="flex-1 min-w-0">
              <PodiumPillar rank={2} player={top2} isMe={top2 && top2.name === player.playerName} />
            </div>
            {/* 1st place */}
            <div className="flex-1 min-w-0 z-10">
              <PodiumPillar rank={1} player={top1} isMe={top1 && top1.name === player.playerName} />
            </div>
            {/* 3rd place */}
            <div className="flex-1 min-w-0">
              <PodiumPillar rank={3} player={top3rd} isMe={top3rd && top3rd.name === player.playerName} />
            </div>
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-2 pt-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-4 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Người chơi</div>
            <div className="col-span-2 text-center">Dự đoán</div>
            <div className="col-span-1 text-center">Acc</div>
            <div className="col-span-2 text-right">Chips</div>
          </div>

          <div className="space-y-1.5">
            {rest.map((p, idx) => {
              const rank = idx + 4;
              const isMe = p.name === player.playerName;
              return (
                <div
                  key={p.name}
                  className={`grid grid-cols-12 items-center px-4 py-2.5 rounded-xl border text-xs transition-all duration-200 hover:translate-x-1 ${
                    isMe
                      ? "bg-[#334BFF]/10 border-[#334BFF]/35 shadow-[0_2px_10px_rgba(51,75,255,0.08)]"
                      : "bg-[#0B1735]/40 border-white/5 hover:bg-slate-800/20"
                  }`}
                >
                  <div className="col-span-1 font-black text-slate-500">
                    {rank}
                  </div>
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 border ${
                        isMe 
                          ? "bg-[#334BFF]/15 border-[#334BFF]/35 text-white" 
                          : "bg-slate-800/60 border-white/5 text-slate-400"
                      }`}
                    >
                      {p.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <span className={`font-bold truncate text-white ${isMe ? "text-[#62F2C0]" : ""}`}>
                      {p.name} {isMe && <span className="text-[9px] text-[#62F2C0] opacity-80 font-normal">(bạn)</span>}
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-slate-400 font-semibold">
                    {p.total}
                  </div>
                  <div className="col-span-1 text-center text-slate-400 font-semibold">
                    {p.winRate}%
                  </div>
                  <div className="col-span-2 text-right font-extrabold text-[#62F2C0] tabular-nums">
                    💎 {fmt(p.chips)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <div className="text-center py-16 bg-[#0B1735]/20 border border-white/5 rounded-2xl">
          <div className="text-4xl mb-3 opacity-30">🏅</div>
          <p className="text-xs text-slate-500 font-medium">
            Chưa có người chơi nào tham gia phòng.
          </p>
        </div>
      )}
    </div>
  );
}
