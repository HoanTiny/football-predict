"use client";

import { useEffect, useMemo, useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnDateKey, vnDateHeader, vnTime } from "@/lib/time";

const TeamLogo = ({ id, name }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  if (!url || err) {
    return (
      <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setErr(true)} className="w-7 h-7 object-contain shrink-0" />
  );
};

// Một đội trên hàng trận: logo + tên + tỉ số. winner = in đậm trắng, loser = mờ.
function TeamLine({ team, score, isWinner, dim }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <TeamLogo id={team.id} name={team.name} />
        <span className={`text-sm font-bold truncate ${dim ? "text-slate-500" : "text-white"}`}>
          {team.name}
        </span>
      </div>
      {score != null && (
        <span
          className={`text-sm font-black tabular-nums shrink-0 ${
            isWinner ? "text-white" : dim ? "text-slate-500" : "text-slate-300"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function MatchRow({ m, onSelect }) {
  const isLive = m.started && !m.finished && !m.cancelled;
  const homeWin = m.finished && m.home.score > m.away.score;
  const awayWin = m.finished && m.away.score > m.home.score;

  // Cột trạng thái bên trái: live (phút) / FT / giờ đá.
  let status;
  if (m.cancelled) {
    status = <span className="text-[10px] font-bold text-slate-500 uppercase">Hoãn</span>;
  } else if (isLive) {
    status = (
      <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#ff5a5a] uppercase tabular-nums">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
        {m.liveTime || m.statusShort || "LIVE"}
      </span>
    );
  } else if (m.finished) {
    status = <span className="text-[10px] font-bold text-slate-500 uppercase">{m.statusShort || "FT"}</span>;
  } else {
    status = <span className="text-xs font-bold text-slate-300 tabular-nums">{vnTime(m.utcTime)}</span>;
  }

  return (
    <button
      onClick={() => onSelect(m)}
      className={`w-full text-left rounded-xl border bg-[#0B1735] px-3 py-2.5 flex items-center gap-3 transition-all hover:bg-white/[0.03] active:scale-[0.99] cursor-pointer ${
        isLive ? "border-[#ff5a5a]/30" : "border-white/5 hover:border-white/10"
      }`}
    >
      <div className="w-12 shrink-0 flex flex-col items-center justify-center text-center">{status}</div>
      <div className="w-px self-stretch bg-white/5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <TeamLine team={m.home} score={m.home.score} isWinner={homeWin} dim={awayWin} />
        <TeamLine team={m.away} score={m.away.score} isWinner={awayWin} dim={homeWin} />
      </div>
      <span className="text-slate-600 text-xs shrink-0">›</span>
    </button>
  );
}

/** Lịch + kết quả một giải. Mặc định hiện cửa sổ quanh "hôm nay"; có nút mở cả mùa. */
export default function LeagueMatches({ league, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setShowAll(false);
    fetch(`/api/leagues/fixtures?id=${league.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.matches || j.matches.length === 0) setError(true);
        else setData(j);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [league.id]);

  // Cửa sổ mặc định: từ 5 ngày trước tới hết tương lai. Nếu rỗng (mùa đã xong) → 20 trận cuối.
  const visible = useMemo(() => {
    if (!data) return [];
    if (showAll) return data.matches;
    const cutoff = Date.now() - 5 * 24 * 3600 * 1000;
    const win = data.matches.filter((m) => new Date(m.utcTime).getTime() >= cutoff);
    return win.length ? win : data.matches.slice(-20);
  }, [data, showAll]);

  const byDate = useMemo(() => {
    const groups = [];
    let lastKey = null;
    for (const m of visible) {
      const key = vnDateKey(m.utcTime);
      if (key !== lastKey) {
        groups.push({ key, header: vnDateHeader(m.utcTime), items: [] });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [visible]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[68px] rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📅</div>
        <p className="text-xs text-slate-500 font-medium">Chưa có lịch thi đấu cho giải này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!showAll && data.matches.length > visible.length && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 rounded-lg text-[11px] font-bold text-slate-400 bg-slate-800/40 border border-white/5 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          ↑ Xem toàn bộ lịch mùa giải ({data.matches.length} trận)
        </button>
      )}
      {byDate.map((g) => (
        <div key={g.key} className="space-y-2.5">
          <div className="flex items-center gap-2.5 pt-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
              {g.header}
            </h3>
            <span className="h-px flex-grow bg-white/5 rounded-full" />
          </div>
          <div className="space-y-2">
            {g.items.map((m) => (
              <MatchRow key={m.id} m={m} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-600 text-center font-medium">Nguồn dữ liệu: FotMob</p>
    </div>
  );
}
