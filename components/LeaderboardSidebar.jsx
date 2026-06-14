"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/constants";
import { allPlayers } from "@/lib/storage";

/** Compact Leaderboard Sidebar — desktop only */
export default function LeaderboardSidebar({ player, matches, roomLeaderboard }) {
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
    // player & matches là trigger tính lại khi dữ liệu localStorage thay đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, matches]);

  const leaderboard = roomLeaderboard || localLeaderboard;
  const list = leaderboard.slice(0, 10); // Show top 10

  return (
    <div
      className="glass rounded-2xl p-5 border border-white/8 space-y-4"
      style={{ background: "rgba(11, 23, 53, 0.45)", backdropFilter: "blur(16px)" }}
    >
      <div>
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase mb-0.5">
          BẢNG XẾP HẠNG
        </h3>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Top Players
        </h4>
      </div>

      <div className="space-y-1.5">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="col-span-2">#</span>
          <span className="col-span-5">Player</span>
          <span className="col-span-2 text-center">Acc</span>
          <span className="col-span-3 text-right">Chips</span>
        </div>

        {/* Players rows */}
        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
          {list.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.name === player.playerName;
            
            // Rank badge style
            const getRankBadgeClass = () => {
              if (rank === 1) return "bg-[#334BFF]/25 text-[#7b8fff] border border-[#334BFF]/45";
              if (rank === 2) return "bg-slate-400/15 text-slate-300 border border-slate-400/30";
              if (rank === 3) return "bg-amber-700/15 text-amber-500 border border-amber-700/30";
              return "bg-slate-800/20 text-slate-400 border border-slate-800/30";
            };

            return (
              <div
                key={p.name}
                className={`grid grid-cols-12 items-center px-3 py-2 rounded-lg text-xs transition-all ${
                  isMe ? "bg-[#334BFF]/10 border border-[#334BFF]/30" : "bg-[#0B1735]/40 border border-white/5"
                }`}
              >
                {/* Rank */}
                <div className="col-span-2 flex">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold ${getRankBadgeClass()}`}>
                    {rank}
                  </span>
                </div>

                {/* Name */}
                <span className={`col-span-5 truncate font-semibold text-white/90 ${isMe ? "text-[#62F2C0]" : ""}`}>
                  {p.name} {isMe && <span className="text-[9px] text-[#62F2C0] opacity-80">(bạn)</span>}
                </span>

                {/* Accuracy */}
                <span className="col-span-2 text-center text-slate-400 font-medium">
                  {p.winRate}%
                </span>

                {/* Points */}
                <span className="col-span-3 text-right font-bold text-white tabular-nums">
                  💎{fmt(p.chips)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-xs">
          Chưa có dữ liệu xếp hạng.
        </div>
      )}
    </div>
  );
}
