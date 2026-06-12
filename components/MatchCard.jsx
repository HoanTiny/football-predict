"use client";

import { flagOf, flagImgOf, isLive } from "@/lib/constants";
import { vnTime } from "@/lib/time";
import { getTeamGroup } from "@/lib/standings";
import StatusBadge from "./StatusBadge";

const renderFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[13px] leading-none">
      {flagOf(teamName)}
    </div>
  );
};

/** Compact Match Row — Figma node-id=10-625, sports-first, symmetrical alignment */
export default function MatchCard({ match, prediction, onBet, roomBets }) {
  const { status } = match;
  const ft = match.score?.fullTime || {};
  const live = isLive(status) || status === "PAUSED";
  const finished = status === "FINISHED";
  const canBet = status === "SCHEDULED" || status === "TIMED";
  const scoreText =
    ft.home == null || ft.away == null ? "–  –" : `${ft.home}  ${ft.away}`;

  // outcomeLabel is calculated inline for multiple predictions

  const groupLetter = getTeamGroup(match.homeTeam?.name);

  return (
    <div
      onClick={() => onBet?.(match)}
      className={`match-card relative px-4 py-3 flex flex-col justify-between ${onBet ? "cursor-pointer" : "cursor-default"}`}
      style={{ minHeight: 96 }}
    >
      {/* Top Metadata Row (Figma inspired: Group, Date/Time, Venue) */}
      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-2.5">
        <span className="text-[#7b8fff]">
          {match.stage === "GROUP_STAGE" && groupLetter
            ? `Bảng ${groupLetter}`
            : match.stage}
          {match.matchday ? ` · Lượt ${match.matchday}` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <span>{vnTime(match.utcDate)}</span>
          {match.venue && (
            <>
              <span>•</span>
              <span className="text-slate-400 max-w-[120px] truncate">
                {match.venue}
              </span>
            </>
          )}
        </span>
      </div>

      {/* Symmetrical Matchup Row */}
      <div className="flex items-center justify-between gap-4 flex-grow">
        {/* Team 1 */}
        <div className="flex-1 flex items-center justify-end gap-2.5 text-right min-w-0">
          <span className="font-bold text-xs text-white truncate">
            {match.homeTeam?.name || "—"}
          </span>
          {renderFlag(match.homeTeam?.name)}
        </div>

        {/* Score Capsule */}
        <div className="score-capsule px-3 py-1.5 text-xs font-bold shrink-0 min-w-[56px] text-center tabular-nums bg-[#334BFF]/10 border border-[#334BFF]/25 text-white">
          {scoreText}
        </div>

        {/* Team 2 */}
        <div className="flex-1 flex items-center justify-start gap-2.5 text-left min-w-0">
          {renderFlag(match.awayTeam?.name)}
          <span className="font-bold text-xs text-white truncate">
            {match.awayTeam?.name || "—"}
          </span>
        </div>
      </div>

      {/* Bottom status row */}
      <div className="flex items-start justify-between mt-2.5 pt-2 border-t border-white/5 gap-2">
        {/* Left Area: Status and Room Bets count */}
        <div className="flex flex-col items-start gap-1 min-w-0 shrink-0">
          <StatusBadge status={status} />
          {roomBets && roomBets.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onBet(match, "friends");
              }}
              className="text-[9px] text-slate-400 hover:text-white transition-colors font-semibold cursor-pointer whitespace-nowrap"
            >
              👥 {roomBets.length} bạn bè đã chốt
            </span>
          )}
        </div>

        {/* Right Area: Prediction tags and Actions */}
        <div
          className="flex flex-wrap gap-1 justify-end items-center max-w-[75%] sm:max-w-none"
          onClick={(e) => e.stopPropagation()}
        >
          {prediction && prediction.length > 0 ? (
            <>
              {prediction.map((p, pIdx) => {
                let outcome = "";
                if (p.status !== "pending") {
                  if (p.status === "won_exact") outcome = "🎯";
                  else if (p.status !== "lost") outcome = "✅";
                  else outcome = "❌";
                }
                return (
                  <div key={pIdx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#334BFF]/10 border border-[#334BFF]/20 text-[9px] text-[#7b8fff] font-bold shrink-0">
                    {outcome && <span className="text-[10px]">{outcome}</span>}
                    <span>
                      {p.homeGoals}–{p.awayGoals} · 💎{p.wager}
                    </span>
                  </div>
                );
              })}
              {canBet && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBet(match);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold hover:bg-emerald-500/20 shrink-0"
                >
                  + Thêm
                </button>
              )}
            </>
          ) : canBet ? (
            <button
              onClick={() => onBet(match)}
              className="btn-primary px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            >
              Dự đoán
            </button>
          ) : (
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mr-1">
              Locked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
