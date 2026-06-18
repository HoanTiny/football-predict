"use client";

import { useEffect, useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnShortDateTime } from "@/lib/time";
import LineupPitch from "../LineupPitch";

// Thống kê hiển thị (theo thứ tự) → nhãn tiếng Việt. Key khớp shape FotMob (lib/fotmob.js).
const STAT_ROWS = [
  ["Ball Possession", "Kiểm soát bóng"],
  ["Total Shots", "Tổng số cú sút"],
  ["Shots on Goal", "Sút trúng đích"],
  ["Corner Kicks", "Phạt góc"],
  ["Offsides", "Việt vị"],
  ["Fouls", "Lỗi"],
  ["Yellow Cards", "Thẻ vàng"],
  ["Red Cards", "Thẻ đỏ"],
  ["Goalkeeper Saves", "Cứu thua"],
  ["Total passes", "Đường chuyền"],
  ["Passes %", "Chính xác chuyền"],
];

const eventIcon = (e) => {
  if (e.type === "Goal") return "⚽";
  if (e.type === "Card") return (e.detail || "").includes("Red") ? "🟥" : "🟨";
  return "•";
};

const statPct = (h, a) => {
  const num = (v) => (typeof v === "string" ? parseFloat(v) : v) || 0;
  const H = num(h), A = num(a);
  return H + A ? Math.round((H / (H + A)) * 100) : 50;
};

const FormPips = ({ form, align = "start" }) => (
  <div className={`flex gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
    {form.length === 0 ? (
      <span className="text-[10px] text-slate-500">—</span>
    ) : (
      form.map((c, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white ${
            c === "W" ? "bg-emerald-500" : c === "L" ? "bg-rose-500" : "bg-slate-500"
          }`}
        >
          {c}
        </span>
      ))
    )}
  </div>
);

const Badge = ({ id, name, size = "lg" }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  const cls = size === "sm" ? "w-6 h-6" : "w-9 h-9";
  if (!url || err) {
    return (
      <div className={`${cls} rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0`}>
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className={`${cls} object-contain shrink-0`} />;
};

/**
 * Modal chi tiết một trận: tỉ số/giờ + đội hình ra sân + thống kê + phong độ + đối đầu.
 * Dữ liệu lấy theo matchId FotMob qua /api/leagues/match. Tự refresh 30s khi trận đang đá.
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

  const homeForm = stats?.form?.home || [];
  const awayForm = stats?.form?.away || [];

  const Section = ({ title, children }) => (
    <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{title}</span>
      {children}
    </div>
  );

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
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              {match.finished || isLive ? (
                <span className="text-2xl font-black text-white tabular-nums">
                  {match.home.score ?? 0}<span className="text-slate-600 mx-1">–</span>{match.away.score ?? 0}
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
            <>
              {stats?.lineups && <LineupPitch lineups={stats.lineups} />}

              {stats?.events?.length > 0 && (
                <Section title="Diễn biến chính">
                  <div className="space-y-1.5">
                    {stats.events.map((e, i) => {
                      const isHome = e.team === match.home.name;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-[11px] ${isHome ? "" : "flex-row-reverse text-right"}`}
                        >
                          <span className="tabular-nums text-slate-500 w-7 shrink-0">
                            {e.minute != null ? `${e.minute}'` : ""}
                          </span>
                          <span className="shrink-0">{eventIcon(e)}</span>
                          <span className="text-white font-semibold truncate">
                            {e.player}
                            {e.assist && <span className="text-slate-500 font-normal"> ({e.assist})</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {stats?.matchStats && (
                <Section title="Thống kê trận đấu">
                  <div className="space-y-2.5">
                    {STAT_ROWS.map(([key, label]) => {
                      const h = stats.matchStats.home?.[key];
                      const a = stats.matchStats.away?.[key];
                      if (h == null && a == null) return null;
                      const pct = statPct(h, a);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-bold text-white">
                            <span className="tabular-nums">{h ?? 0}</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
                            <span className="tabular-nums">{a ?? 0}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-700/40">
                            <div className="bg-[#334BFF] h-full" style={{ width: `${pct}%` }} />
                            <div className="bg-[#FFA07A] h-full" style={{ width: `${100 - pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isLive && <div className="text-[9px] text-slate-500 text-center">Tự cập nhật mỗi 30s khi trận đang diễn ra</div>}
                </Section>
              )}

              <Section title="So sánh phong độ">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5 justify-start min-w-0">
                    <Badge id={match.home.id} name={match.home.name} size="sm" />
                    <span className="font-bold text-white truncate text-xs">{match.home.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 px-2 shrink-0">VS</span>
                  <div className="flex items-center gap-1.5 justify-end min-w-0">
                    <span className="font-bold text-white truncate text-xs text-right">{match.away.name}</span>
                    <Badge id={match.away.id} name={match.away.name} size="sm" />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
                  <FormPips form={homeForm} align="start" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full min-w-[70px]">
                    {loading ? "…" : "5 trận gần"}
                  </span>
                  <FormPips form={awayForm} align="end" />
                </div>
              </Section>

              {(stats?.venue || stats?.city) && (
                <Section title="Sân đấu">
                  <div className="flex items-center gap-2 text-[11px] text-white font-semibold">
                    <span>🏟</span>
                    <span>{[stats.venue, stats.city].filter(Boolean).join(" · ")}</span>
                  </div>
                </Section>
              )}

              <Section title="Lịch sử đối đầu (H2H)">
                {stats?.h2h?.length ? (
                  <div className="space-y-3">
                    {stats.h2h.map((g, i) => (
                      <div
                        key={i}
                        className={`flex flex-col gap-1 ${i < stats.h2h.length - 1 ? "pb-2.5 border-b border-white/5" : ""}`}
                      >
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          {[g.league, g.season].filter(Boolean).join(" · ")}
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <span className="font-semibold text-white truncate text-[11px] text-right">{g.home}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/5 text-white font-mono font-black text-[11px] shrink-0 min-w-[38px] text-center">
                            {g.homeGoals ?? "-"} - {g.awayGoals ?? "-"}
                          </span>
                          <span className="font-semibold text-white truncate text-[11px] text-left">{g.away}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 text-center py-2">Không có dữ liệu đối đầu gần đây.</div>
                )}
              </Section>

              <p className="text-[10px] text-slate-600 text-center font-medium">Nguồn dữ liệu: FotMob</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
