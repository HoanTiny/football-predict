"use client";

import { useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnTime } from "@/lib/time";
import { flagImgOf } from "@/lib/constants";

export const TeamLogo = ({ id, name }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  const fallbackUrl = !url || err ? flagImgOf(name) : null;

  if (fallbackUrl) {
    return (
      <img
        src={fallbackUrl}
        alt={name}
        className="w-7 h-7 object-cover rounded-full shrink-0 border border-white/10"
      />
    );
  }

  if (!url || err) {
    return (
      <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[9px] font-bold text-white/60 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setErr(true)} className="w-7 h-7 object-contain shrink-0" />
  );
};

// Một đội trên hàng trận: logo + tên + tỉ số. winner = in đậm trắng, loser = mờ.
export function TeamLine({ team, score, isWinner, dim }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <TeamLogo id={team.id} name={team.name} />
        <span className={`text-sm font-bold truncate ${dim ? "text-white/45" : "text-white"}`}>
          {team.name}
        </span>
      </div>
      {score != null && (
        <span
          className={`text-sm font-black tabular-nums shrink-0 ${
            isWinner ? "text-white" : dim ? "text-white/45" : "text-white/75"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/**
 * 1 hàng trận dùng chung cho mọi nơi hiển thị trận theo shape FotMob chuẩn hoá:
 * { id, utcTime, finished, started, cancelled, statusShort, liveTime, pen:{home,away}|null,
 *   home:{id,name,score}, away:{id,name,score} }.
 * Dùng ở cả LeagueMatches (1 giải) và HomeTab (nhiều giải trong ngày).
 */
export default function MatchRow({ m, onSelect }) {
  const isLive = m.started && !m.finished && !m.cancelled;
  // Trận đi loạt luân lưu: người thắng thật xác định bằng tỉ số PEN, không phải tỉ số thường
  // (thường hoà, vd 1-1) — nếu không có số pen chính xác (nguồn thiếu) thì không tô đậm ai.
  const homeWin = m.finished && (m.pen ? m.pen.home > m.pen.away : m.home.score > m.away.score);
  const awayWin = m.finished && (m.pen ? m.pen.away > m.pen.home : m.away.score > m.home.score);

  // Cột trạng thái bên trái: live (phút) / FT / giờ đá.
  let status;
  if (m.cancelled) {
    status = <span className="text-[10px] font-bold text-white/50 uppercase">Hoãn</span>;
  } else if (isLive) {
    status = (
      <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#ff8a8a] uppercase tabular-nums">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
        {m.liveTime || m.statusShort || "LIVE"}
      </span>
    );
  } else if (m.finished) {
    status = <span className="text-[10px] font-bold text-white/50 uppercase">{m.statusShort || "FT"}</span>;
  } else {
    status = <span className="text-xs font-bold text-white/80 tabular-nums">{vnTime(m.utcTime)}</span>;
  }

  // Trận kết thúc sau loạt luân lưu (statusShort "Pen") — hiện số pen nếu nguồn có, không thì
  // chỉ ghi chú gọn (không bịa số, vd danh sách trận từ endpoint fixtures thiếu penScore).
  const wentToPen = m.finished && (m.pen || m.statusShort === "Pen");

  return (
    <button
      onClick={() => onSelect(m)}
      className={`w-full text-left rounded-2xl border backdrop-blur-xl flex flex-col overflow-hidden transition-all active:scale-[0.99] cursor-pointer ${
        isLive
          ? "bg-[#ff5a5a]/10 border-[#ff5a5a]/30 hover:bg-[#ff5a5a]/15"
          : "bg-white/[0.06] border-white/10 hover:bg-white/[0.1]"
      }`}
    >
      <div className="w-full px-3 py-2.5 flex items-center gap-3">
        <div className="w-12 shrink-0 flex flex-col items-center justify-center text-center">{status}</div>
        <div className="w-px self-stretch bg-white/10" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <TeamLine team={m.home} score={m.home.score} isWinner={homeWin} dim={awayWin} />
          <TeamLine team={m.away} score={m.away.score} isWinner={awayWin} dim={homeWin} />
        </div>
        <span className="text-white/40 text-xs shrink-0">›</span>
      </div>
      {wentToPen && (
        <div className="text-[10px] font-bold text-[#FFB454] tabular-nums text-center bg-white/5 border-t border-white/10 py-1">
          {m.pen ? `PĐ ${m.pen.home}-${m.pen.away}` : "Kết thúc sau loạt luân lưu"}
        </div>
      )}
    </button>
  );
}
