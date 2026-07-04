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
  }, [player, matches]);

  const leaderboard = roomLeaderboard || localLeaderboard;
  const list = leaderboard.slice(0, 10); // Show top 10

  return (
    <div
      className="rounded-[28px] p-5 border border-white/10 space-y-4"
      style={{ background: "rgba(11, 23, 53, 0.45)", backdropFilter: "blur(16px)" }}
    >
      <div className="select-none">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase mb-0.5">
          BẢNG XẾP HẠNG
        </h3>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Top Players
        </h4>
      </div>

      <div className="space-y-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
          <span className="col-span-2">#</span>
          <span className="col-span-5">Player</span>
          <span className="col-span-2 text-center">Acc</span>
          <span className="col-span-3 text-right">Chips</span>
        </div>

        {/* Players rows list container */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-[420px] overflow-y-auto scrollbar-thin">
          {list.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.name === player.playerName;
            
            // Rank badge style
            const getRankBadgeClass = () => {
              if (rank === 1) return "bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30";
              if (rank === 2) return "bg-slate-450/15 text-slate-300 border border-slate-450/25";
              if (rank === 3) return "bg-orange-500/15 text-orange-400 border border-orange-500/25";
              return "bg-white/5 text-white/40 border border-white/10";
            };

            return (
              <div
                key={p.name}
                className={`grid grid-cols-12 items-center px-3 py-2.5 text-xs transition-all duration-150 ${
                  isMe ? "bg-[#334BFF]/10 text-white font-bold" : "text-white/80 hover:bg-white/[0.03]"
                }`}
              >
                {/* Rank */}
                <div className="col-span-2 flex select-none">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-extrabold ${getRankBadgeClass()}`}>
                    {rank}
                  </span>
                </div>

                {/* Name */}
                <span className={`col-span-5 truncate ${isMe ? "text-[#62F2C0]" : "text-white/95"}`}>
                  {p.name} {isMe && <span className="text-[9px] text-[#62F2C0] opacity-80 font-normal">(bạn)</span>}
                </span>

                {/* Accuracy */}
                <span className="col-span-2 text-center text-slate-400 font-medium select-none">
                  {p.winRate}%
                </span>

                {/* Points */}
                <span className="col-span-3 text-right font-extrabold text-white tabular-nums">
                  💎{fmt(p.chips)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-xs select-none">
          Chưa có dữ liệu xếp hạng.
        </div>
      )}
    </div>
  );
}
