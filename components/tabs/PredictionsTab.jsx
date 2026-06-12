"use client";

import { flagOf, flagImgOf, fmt } from "@/lib/constants";
import { vnTime, vnDateHeader } from "@/lib/time";

const renderTeamFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return <span className="text-xl shrink-0">{flagOf(teamName)}</span>;
};

/** TAB 2 — Dự đoán — Flat prediction rows */
export default function PredictionsTab({ player, matchById, onGoSchedule }) {
  if (player.predictions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-30">🎯</div>
        <p className="text-xs text-slate-500 font-semibold mb-4">
          Bạn chưa có dự đoán nào.
        </p>
        <button
          onClick={onGoSchedule}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold"
        >
          Xem lịch thi đấu →
        </button>
      </div>
    );
  }

  const settled = player.predictions.filter(p => p.status !== "pending");
  const wins = settled.filter(p => p.status !== "lost").length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
            DỰ ĐOÁN CỦA TÔI
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {player.predictions.length} dự đoán
          </div>
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="bg-[#62F2C0]/12 text-[#62F2C0] px-2 py-0.5 rounded">
            ✅ {wins} THẮNG
          </span>
          <span className="bg-[#E40000]/12 text-[#ff4d4d] px-2 py-0.5 rounded">
            ❌ {settled.length - wins} THUA
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {[...player.predictions].reverse().map((p, idx) => {
          const m = matchById.get(p.matchId);
          const home = m?.homeTeam?.name || "?";
          const away = m?.awayTeam?.name || "?";

          const statusConfig = {
            pending:     { bg: "bg-[#0B1735]/40 border-white/5",          label: "⏳ Chờ kết quả", labelClass: "bg-[#334BFF]/12 text-[#7b8fff]" },
            won_exact:   { bg: "bg-[#62F2C0]/5 border-[#62F2C0]/20",   label: "🎯 Đúng tỉ số", labelClass: "bg-[#62F2C0]/15 text-[#62F2C0]" },
            won_outcome: { bg: "bg-[#334BFF]/5 border-[#334BFF]/20",     label: "✅ Đúng kết quả", labelClass: "bg-[#334BFF]/15 text-[#7b8fff]" },
            lost:        { bg: "bg-[#E40000]/5 border-[#E40000]/15",       label: "❌ Sai", labelClass: "bg-[#E40000]/15 text-[#ff4d4d]" },
          };
          const sc = statusConfig[p.status] || statusConfig.pending;

          return (
            <div
              key={p.matchId + "_" + idx}
              className={`rounded-xl px-4 py-3 flex items-center justify-between gap-4 border ${sc.bg}`}
            >
              {/* Symmetrical prediction display */}
              <div className="flex-grow flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  {/* Team 1 */}
                  <div className="flex-1 flex items-center justify-end gap-2 text-right">
                    <span className="font-bold text-sm text-white truncate max-w-[100px] sm:max-w-none">
                      {home}
                    </span>
                    {renderTeamFlag(home)}
                  </div>

                  {/* Predicted score capsule */}
                  <div className="score-capsule px-3 py-0.5 text-xs font-bold shrink-0 min-w-[54px] text-center tabular-nums bg-white/5 border border-white/10 text-white">
                    {p.homeGoals} – {p.awayGoals}
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 flex items-center justify-start gap-2 text-left">
                    {renderTeamFlag(away)}
                    <span className="font-bold text-sm text-white truncate max-w-[100px] sm:max-w-none">
                      {away}
                    </span>
                  </div>
                </div>

                {/* Date / actual score row */}
                <div className="flex justify-center items-center gap-2 mt-2 text-[10px] text-slate-500 font-medium">
                  <span>{m ? `${vnDateHeader(m.utcDate)} · ${vnTime(m.utcDate)}` : "—"}</span>
                  {p.finalScore && (
                    <>
                      <span>•</span>
                      <span>Tỉ số thật: <strong className="text-white">{p.finalScore}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Payout right section */}
              <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${sc.labelClass}`}>
                  {sc.label}
                </span>
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span className="text-slate-400 font-medium">💎{p.wager}</span>
                  {p.status !== "pending" && p.payout !== 0 && (
                    <span className={p.payout > 0 ? "text-[#62F2C0]" : "text-[#ff5a5a]"}>
                      ({p.payout > 0 ? "+" : ""}{fmt(p.payout)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
