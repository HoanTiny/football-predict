"use client";

import { useState, useEffect } from "react";
import { flagOf, flagImgOf, isLiveStatus, matchIsLive, liveStatusVN, betLabel, realScore } from "@/lib/constants";
import { vnTime, vnDateHeader } from "@/lib/time";
import { getTeamGroup } from "@/lib/standings";

const renderFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[14px] leading-none">
      {flagOf(teamName)}
    </div>
  );
};

/** Compact Stacked Match Row — styled exactly like MatchRow.jsx for visual sync */
export default function MatchCard({ match, prediction, onBet, roomBets }) {
  const { status } = match;
  const ft = match.score?.fullTime || {};
  const finished = status === "FINISHED";
  const live = matchIsLive(match);
  // Nếu provider trễ status (đã có tỉ số mà vẫn TIMED) thì coi là TRỰC TIẾP.
  const effectiveStatus = finished
    ? "FINISHED"
    : isLiveStatus(status)
      ? status
      : live
        ? "IN_PLAY"
        : status;
  const canBet = !live && (status === "SCHEDULED" || status === "TIMED");
  const [liveDetail, setLiveDetail] = useState({ minute: null, events: [], score: null });
  const homeName = match.homeTeam?.name;
  const awayName = match.awayTeam?.name;
  useEffect(() => {
    if (!live) {
      setLiveDetail({ minute: null, events: [], score: null });
      return;
    }
    let active = true;
    const load = () => {
      const qs = new URLSearchParams({
        home: homeName || "",
        away: awayName || "",
        venue: match.venue || "",
        date: match.utcDate || "",
      });
      fetch(`/api/match-stats?${qs}`)
        .then((r) => r.json())
        .then((d) => active && setLiveDetail({ minute: d.liveMinute || null, events: d.events || [], score: d.liveScore || null }))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [live, homeName, awayName, match.venue, match.utcDate]);

  // Tỉ số: ưu tiên LIVE từ FotMob (football-data hay trễ 1-2' khi đang đá).
  const rs = finished ? realScore(match) : null;
  const sHome = liveDetail.score?.home ?? rs?.home ?? ft.home;
  const sAway = liveDetail.score?.away ?? rs?.away ?? ft.away;

  const liveText = live
    ? liveStatusVN(match.minute != null ? String(match.minute) : liveDetail.minute)
    : null;

  const groupLetter = getTeamGroup(match.homeTeam?.name);
  const homeWin = finished && (rs?.isPen ? rs.pen.home > rs.pen.away : sHome > sAway);
  const awayWin = finished && (rs?.isPen ? rs.pen.away > rs.pen.home : sAway > sHome);

  // Cột trạng thái bên trái giống MatchRow.jsx
  let statusText;
  if (status === "CANCELLED") {
    statusText = <span className="text-[10px] font-bold text-white/50 uppercase">Hoãn</span>;
  } else if (live) {
    statusText = (
      <span className="flex flex-col items-center gap-0.5 text-[10px] font-extrabold text-[#ff8a8a] uppercase tabular-nums">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
        <span>{liveText || "LIVE"}</span>
      </span>
    );
  } else if (finished) {
    statusText = <span className="text-[10px] font-bold text-white/50 uppercase">FT</span>;
  } else {
    statusText = <span className="text-xs font-bold text-white/80 tabular-nums">{vnTime(match.utcDate)}</span>;
  }

  return (
    <div
      onClick={() => onBet?.(match)}
      className={`match-card overflow-hidden w-full text-left backdrop-blur-xl flex flex-col transition-all duration-200 ${onBet ? "cursor-pointer" : "cursor-default"} ${
        live
          ? "bg-[#ff5a5a]/10 border-[#ff5a5a]/30 hover:bg-[#ff5a5a]/15 shadow-[0_0_12px_rgba(255,90,90,0.15)]"
          : ""
      }`}
    >
      {/* Top Metadata Row (Only displays on the predictions version for stage context, small and subtle) */}
      <div className="w-full px-3 pt-2 pb-1 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
        <span className="text-[#7b8fff]">
          {match.stage === "GROUP_STAGE" && groupLetter
            ? `Bảng ${groupLetter}`
            : match.stage}
          {match.matchday ? ` · Lượt ${match.matchday}` : ""}
        </span>
        {match.venue && (
          <span className="text-slate-400 truncate max-w-[150px]">
            {match.venue}
          </span>
        )}
      </div>

      {/* Main Matchup Row */}
      <div className="w-full px-3 py-2.5 flex items-center gap-3">
        {/* Left Column - Status / Kickoff time */}
        <div className="w-12 shrink-0 flex flex-col items-center justify-center text-center">
          {statusText}
        </div>

        {/* Vertical Divider */}
        <div className="w-px self-stretch bg-white/10" />

        {/* Middle Stacked Team Rows */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Home team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {renderFlag(match.homeTeam?.name)}
              <span className={`text-sm font-bold truncate ${awayWin ? "text-white/45" : "text-white"}`}>
                {match.homeTeam?.name || "—"}
              </span>
            </div>
            {sHome != null && (
              <span
                className={`text-sm font-black tabular-nums shrink-0 ${
                  homeWin ? "text-white" : awayWin ? "text-white/45" : "text-white/75"
                }`}
              >
                {sHome}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {renderFlag(match.awayTeam?.name)}
              <span className={`text-sm font-bold truncate ${homeWin ? "text-white/45" : "text-white"}`}>
                {match.awayTeam?.name || "—"}
              </span>
            </div>
            {sAway != null && (
              <span
                className={`text-sm font-black tabular-nums shrink-0 ${
                  awayWin ? "text-white" : homeWin ? "text-white/45" : "text-white/75"
                }`}
              >
                {sAway}
              </span>
            )}
          </div>
        </div>

        {/* Chevron Arrow on right */}
        <span className="text-white/40 text-xs shrink-0 select-none">›</span>
      </div>

      {/* Shootout Pen Score Row */}
      {rs?.isPen && (
        <div className="text-[10px] font-bold text-[#FFB454] tabular-nums text-center bg-white/5 border-t border-white/10 py-1 w-full">
          PĐ {rs.pen.home}-{rs.pen.away}
        </div>
      )}
      {rs?.isAet && !rs?.isPen && (
        <div className="text-[9px] font-bold text-slate-400 tracking-wider text-center bg-white/5 border-t border-white/10 py-1 w-full uppercase">
          Hiệp phụ (AET)
        </div>
      )}

      {/* Predictions & Bets Footer Bar */}
      {(prediction?.length > 0 || roomBets?.length > 0 || canBet) && (
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-t border-white/5 text-[10px] w-full">
          {/* Left: Friends bets count */}
          <div className="text-[9px] text-slate-400 font-semibold">
            {roomBets && roomBets.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onBet?.(match, "friends");
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                👥 {roomBets.length} bạn bè đã chốt
              </span>
            )}
          </div>

          {/* Right: User's prediction tags / "Dự đoán" button */}
          <div
            className="flex flex-wrap gap-1 justify-end items-center"
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
                    <div key={pIdx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#334BFF]/10 border border-[#334BFF]/20 text-[9px] text-[#7b8fff] font-bold shrink-0">
                      {outcome && <span className="text-[10px]">{outcome}</span>}
                      <span>
                        {betLabel(p)} · 💎{p.wager}
                      </span>
                    </div>
                  );
                })}
                {canBet && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBet?.(match);
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold hover:bg-emerald-500/20 shrink-0 cursor-pointer"
                  >
                    + Thêm
                  </button>
                )}
              </>
            ) : canBet ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBet?.(match);
                }}
                className="btn-primary px-3 py-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Dự đoán
              </button>
            ) : (
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none pr-1">
                Đã khóa
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
