"use client";

import { useEffect, useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnShortDateTime } from "@/lib/time";
import MatchDetailView from "../match/MatchDetailView";
import FollowButton from "../FollowButton";

const Badge = ({ id, name }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  if (!url || err) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className="w-9 h-9 object-contain shrink-0" />;
};

/**
 * Modal chi tiết một trận: tỉ số/giờ + đội hình + thống kê + phong độ + đối đầu.
 * Header riêng (logo + tỉ số live); thân tái dùng MatchDetailView. Refresh 30s khi đang đá.
 */
export default function MatchDetailSheet({ match, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isLive = match.started && !match.finished && !match.cancelled;

  useEffect(() => {
    let alive = true;
    const load = (silent) => {
      if (!silent) setLoading(true);
      fetch(`/api/leagues/match?id=${match.id}`)
        .then((r) => r.json())
        .then((j) => alive && setStats(j))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
    };
    load(false);
    const iv = isLive ? setInterval(() => load(true), 30000) : null;
    return () => {
      alive = false;
      if (iv) clearInterval(iv);
    };
  }, [match.id, isLive]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col bg-[#08142D] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — tỉ số / giờ */}
        <div className="relative shrink-0 px-4 pt-4 pb-3 border-b border-white/5 bg-gradient-to-b from-[#0B1735] to-[#08142D]">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <Badge id={match.home.id} name={match.home.name} />
              <span className="text-xs font-bold text-white text-center truncate max-w-full">{match.home.name}</span>
              {match.home.id != null && <FollowButton kind="team" id={match.home.id} name={match.home.name} size="sm" />}
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              {match.finished || isLive ? (
                <span className="text-2xl font-black text-white tabular-nums">
                  {stats?.liveScore?.home ?? match.home.score ?? 0}<span className="text-slate-600 mx-1">–</span>{stats?.liveScore?.away ?? match.away.score ?? 0}
                </span>
              ) : (
                <span className="text-base font-black text-white tabular-nums">{vnShortDateTime(match.utcTime)}</span>
              )}
              <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isLive ? "text-[#ff5a5a]" : "text-slate-500"}`}>
                {isLive ? (stats?.liveMinute || match.liveTime || "Đang đá") : match.finished ? (match.statusShort || "Kết thúc") : "Sắp đá"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <Badge id={match.away.id} name={match.away.name} />
              <span className="text-xs font-bold text-white text-center truncate max-w-full">{match.away.name}</span>
              {match.away.id != null && <FollowButton kind="team" id={match.away.id} name={match.away.name} size="sm" />}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs text-slate-300">
          {loading && !stats ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <MatchDetailView
              stats={stats}
              loading={loading}
              home={match.home}
              away={match.away}
              isLive={isLive}
            />
          )}
        </div>
      </div>
    </div>
  );
}
