"use client";

import { useState } from "react";
import { flagOf, flagImgOf, fmt, betLabel } from "@/lib/constants";
import { vnTime, vnDateHeader, vnShortDateTime } from "@/lib/time";

const renderTeamFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-white/10">
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

/**
 * Tra trận cho 1 dự đoán: ưu tiên khớp thẳng match_id; nếu không có (vd dự đoán đặt TRƯỚC khi
 * đổi nguồn lịch trận, xem lib/predictMatches.js) thì tìm trận có giờ bóng lăn gần nhất với
 * `kickoff` đã lưu lúc đặt cược (trong khoảng 3 phút) — vẫn ra đúng tên đội dù đổi hệ id.
 */
function resolveMatch(matchById, matches, p) {
  const direct = matchById.get(String(p.matchId));
  if (direct) return direct;
  if (!p.kickoff || !matches?.length) return null;
  const target = new Date(p.kickoff).getTime();
  if (isNaN(target)) return null;
  let best = null, bestDiff = Infinity;
  for (const m of matches) {
    const diff = Math.abs(new Date(m.utcDate).getTime() - target);
    if (diff < bestDiff) { bestDiff = diff; best = m; }
  }
  return bestDiff <= 3 * 60000 ? best : null;
}

const STATUS_CONFIG = {
  pending:     { bg: "bg-white/[0.06] border-white/12",       label: "⏳ Chờ kết quả",  labelClass: "bg-white/15 text-white/85" },
  won_exact:   { bg: "bg-[#62F2C0]/5 border-[#62F2C0]/20",    label: "🎯 Đúng tỉ số",   labelClass: "bg-[#62F2C0]/15 text-[#62F2C0]" },
  won_outcome: { bg: "bg-[#7b8fff]/10 border-[#7b8fff]/25",   label: "✅ Đúng kết quả", labelClass: "bg-[#7b8fff]/20 text-[#a5b5ff]" },
  lost:        { bg: "bg-[#E40000]/5 border-[#E40000]/15",    label: "❌ Sai",          labelClass: "bg-[#E40000]/15 text-[#ff4d4d]" },
};

/** Dự đoán của cả phòng, nhóm theo trận — minh bạch ai cược gì, lúc nào. */
function RoomPredictions({ betsByMatch, matchById, matches }) {
  const matchGroups = [...betsByMatch.entries()]
    .map(([matchId, bets]) => ({
      matchId,
      match: resolveMatch(matchById, matches, { matchId, kickoff: bets[0]?.kickoff }),
      bets: [...bets].sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt)),
    }))
    .sort((a, b) => new Date(b.match?.utcDate || 0) - new Date(a.match?.utcDate || 0));

  if (matchGroups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-30">🏟</div>
        <p className="text-xs text-white/50 font-semibold">
          Phòng chưa có dự đoán nào.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matchGroups.map(({ matchId, match, bets }) => {
        const home = match?.homeTeam?.name || "?";
        const away = match?.awayTeam?.name || "?";
        // Trận còn đặt cược được → ẩn dự đoán + chip của người khác để tránh đoán theo.
        const matchOpen =
          !match || match.status === "SCHEDULED" || match.status === "TIMED";
        return (
          <div key={matchId} className="rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden">
            {/* Match header */}
            <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white/[0.06] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">{home}</span>
                {renderTeamFlag(home)}
              </div>
              <span className="text-[10px] text-white/50 font-semibold px-1">
                {match ? `${vnDateHeader(match.utcDate)} · ${vnTime(match.utcDate)}` : "vs"}
              </span>
              <div className="flex items-center gap-2">
                {renderTeamFlag(away)}
                <span className="font-bold text-xs text-white">{away}</span>
              </div>
            </div>

            {matchOpen && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-400/[0.06] border-b border-amber-400/15 px-4 py-1.5">
                <span>🔒</span>
                <span>Dự đoán của người khác được ẩn đến khi khóa cược (bóng lăn).</span>
              </div>
            )}

            {/* Bets — sorted by placed time, earliest first */}
            <div className="divide-y divide-white/[0.04]">
              {bets.map((b, i) => {
                const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                // Lộ giá trị khi: là mình / trận đã khóa / cược đã quyết toán.
                const reveal = b.isMe || !matchOpen || b.status !== "pending";
                return (
                  <div
                    key={b.id || `${b.playerName}_${i}`}
                    className={`flex flex-col gap-1.5 px-4 py-2.5 text-xs ${b.isMe ? "bg-white/[0.09]" : ""}`}
                  >
                    {/* Line 1 — player name (full, wraps instead of truncating) + status */}
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-white break-words min-w-0 leading-snug">
                        {b.playerName}
                        {b.isMe && <span className="text-[#62F2C0] text-[10px] font-bold ml-1">(bạn)</span>}
                      </span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${sc.labelClass}`}>
                        {sc.label}
                      </span>
                    </div>

                    {/* Line 2 — predicted score / wager / payout / placed time */}
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[10px]">
                      {reveal ? (
                        <span className="score-capsule px-2 py-0.5 text-[11px] font-bold tabular-nums bg-white/5 border border-white/10 text-white shrink-0">
                          {betLabel(b)}
                        </span>
                      ) : (
                        <span className="score-capsule px-2 py-0.5 text-[11px] font-bold bg-white/5 border border-white/10 text-white/50 shrink-0 blur-[3px] select-none" aria-label="đã ẩn">
                          ? – ?
                        </span>
                      )}
                      {reveal ? (
                        <span className="text-white/60 font-medium tabular-nums shrink-0">💎{fmt(b.wager)}</span>
                      ) : (
                        <span className="text-white/50 font-medium shrink-0">💎<span className="blur-[3px] select-none" aria-label="đã ẩn">???</span></span>
                      )}
                      {b.status !== "pending" && b.payout !== 0 && (
                        <span className={`font-bold tabular-nums shrink-0 ${b.payout > 0 ? "text-[#62F2C0]" : "text-[#ff5a5a]"}`}>
                          ({b.payout > 0 ? "+" : ""}{fmt(b.payout)})
                        </span>
                      )}
                      {b.placedAt && (
                        <span className="ml-auto text-white/50 font-medium tabular-nums shrink-0" title="Thời gian đặt cược">
                          🕐 {vnShortDateTime(b.placedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** TAB 2 — Dự đoán — Flat prediction rows (+ view cả phòng khi chơi theo phòng) */
export default function PredictionsTab({ player, matchById, matches, onGoSchedule, betsByMatch }) {
  const inRoom = !!betsByMatch;
  const [view, setView] = useState("mine"); // "mine" | "room"

  const settled = player.predictions.filter(p => p.status !== "pending");
  const wins = settled.filter(p => p.status !== "lost").length;

  const viewToggle = inRoom && (
    <div className="flex items-center gap-0.5 p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      {[
        { key: "mine", label: "🎯 Của tôi" },
        { key: "room", label: "🏟 Cả phòng" },
      ].map((v) => (
        <button
          key={v.key}
          onClick={() => setView(v.key)}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 ${
            view === v.key
              ? "bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );

  if (view === "room" && inRoom) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
              DỰ ĐOÁN CẢ PHÒNG
            </div>
            <div className="text-[11px] text-white/50 font-semibold mt-0.5">
              Minh bạch — ai cược gì, lúc nào
            </div>
          </div>
          {viewToggle}
        </div>
        <RoomPredictions betsByMatch={betsByMatch} matchById={matchById} matches={matches} />
      </div>
    );
  }

  if (player.predictions.length === 0) {
    return (
      <div className="space-y-4">
        {inRoom && <div className="flex justify-end pb-2">{viewToggle}</div>}
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-30">🎯</div>
          <p className="text-xs text-white/50 font-semibold mb-4">
            Bạn chưa có dự đoán nào.
          </p>
          <button
            onClick={onGoSchedule}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold"
          >
            Xem lịch thi đấu →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between pb-2 gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
            DỰ ĐOÁN CỦA TÔI
          </div>
          <div className="text-[11px] text-white/50 font-semibold mt-0.5">
            {player.predictions.length} dự đoán
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-[10px] font-bold">
            <span className="bg-[#62F2C0]/12 text-[#62F2C0] px-2 py-0.5 rounded">
              ✅ {wins} THẮNG
            </span>
            <span className="bg-[#E40000]/12 text-[#ff4d4d] px-2 py-0.5 rounded">
              ❌ {settled.length - wins} THUA
            </span>
          </div>
          {viewToggle}
        </div>
      </div>

      <div className="space-y-2.5">
        {[...player.predictions].reverse().map((p, idx) => {
          const m = resolveMatch(matchById, matches, p);
          const home = m?.homeTeam?.name || "?";
          const away = m?.awayTeam?.name || "?";
          const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;

          const isWin = p.payout > 0;

          return (
            <div
              key={p.matchId + "_" + idx}
              className={`rounded-xl px-3.5 py-3 flex flex-col gap-2.5 border ${sc.bg}`}
            >
              {/* Top row — status badge (left) + wager/payout (right). Own row so it never overflows on mobile. */}
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${sc.labelClass}`}>
                  {sc.label}
                </span>
                <div className="flex items-center gap-1.5 font-bold text-xs shrink-0">
                  <span className="text-white/75 font-semibold tabular-nums">💎{fmt(p.wager)}</span>
                  {p.status !== "pending" && p.payout !== 0 && (
                    <span className={`tabular-nums ${isWin ? "text-[#62F2C0]" : "text-[#ff5a5a]"}`}>
                      ({isWin ? "+" : ""}{fmt(p.payout)})
                    </span>
                  )}
                </div>
              </div>

              {/* Match row — symmetric, teams truncate instead of pushing content off-screen */}
              <div className="flex items-center justify-center gap-2.5">
                {/* Team 1 */}
                <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span className="font-bold text-sm text-white truncate text-right">
                    {home}
                  </span>
                  {renderTeamFlag(home)}
                </div>

                {/* Predicted score capsule */}
                <div className="score-capsule px-3 py-1 text-sm font-bold shrink-0 min-w-[56px] text-center tabular-nums bg-white/5 border border-white/10 text-white">
                  {betLabel(p)}
                </div>

                {/* Team 2 */}
                <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                  {renderTeamFlag(away)}
                  <span className="font-bold text-sm text-white truncate text-left">
                    {away}
                  </span>
                </div>
              </div>

              {/* Meta row — date / placed time / actual score */}
              <div className="flex justify-center items-center gap-x-2 gap-y-0.5 text-[10px] text-white/50 font-medium flex-wrap">
                <span>{m ? `${vnDateHeader(m.utcDate)} · ${vnTime(m.utcDate)}` : "—"}</span>
                {p.placedAt && (
                  <>
                    <span className="opacity-60">•</span>
                    <span title="Thời gian đặt cược">🕐 Cược lúc {vnShortDateTime(p.placedAt)}</span>
                  </>
                )}
                {p.finalScore && (
                  <>
                    <span className="opacity-60">•</span>
                    <span>Tỉ số thật: <strong className="text-white">{p.finalScore}</strong></span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
