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

  let outcomeLabel = "";
  if (prediction && prediction.status !== "pending") {
    if (prediction.status === "won_exact") outcomeLabel = "🎯";
    else if (prediction.status !== "lost") outcomeLabel = "✅";
    else outcomeLabel = "❌";
  }

  const groupLetter = getTeamGroup(match.homeTeam?.name);

  return (
    <div
      onClick={() => onBet(match)}
      className="match-card relative px-4 py-3 cursor-pointer flex flex-col justify-between"
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
      <div className="flex items-center justify-between mt-2.5 pt-1 border-t border-white/5">
        <StatusBadge status={status} />
        {/* Action / Prediction Status Right Area */}
        <div
          className="flex justify-end shrink-0 ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          {prediction ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#334BFF]/10 border border-[#334BFF]/25 text-[10px] text-[#7b8fff] font-bold">
              {outcomeLabel && <span className="text-xs">{outcomeLabel}</span>}
              <span>
                {prediction.homeGoals}–{prediction.awayGoals} · 💎
                {prediction.wager}
              </span>
            </div>
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
        {roomBets && roomBets.length > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onBet(match, "friends");
            }}
            className="text-[9px] text-slate-400 hover:text-white transition-colors font-semibold cursor-pointer"
          >
            👥 {roomBets.length} bạn bè đã chốt
          </span>
        )}
      </div>
    </div>
  );
}
