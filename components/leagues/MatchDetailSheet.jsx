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
const TABS = [
  { key: "lineup", label: "Đội hình" },
  { key: "events", label: "Diễn biến" },
  { key: "stats", label: "Thống kê" },
];

export default function MatchDetailSheet({ match, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("lineup");
  const isLive = match.started && !match.finished && !match.cancelled;

  useEffect(() => {
    setTab("lineup");
  }, [match.id]);

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

  const alphaColor = (color, alpha = 0.15) => {
    if (!color || typeof color !== "string") return `rgba(255, 255, 255, ${alpha})`;
    let cleanHex = color.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((c) => c + c).join("");
    }
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  };

  const homeColor = stats?.teamColors?.darkMode?.home || "#334BFF";
  const awayColor = stats?.teamColors?.darkMode?.away || "#FFA07A";
  const pen = stats?.pen || match.pen || null;

  const containerStyle = {
    background: `
      radial-gradient(circle at 15% 15%, ${alphaColor(homeColor, 0.22)} 0%, transparent 45%),
      radial-gradient(circle at 85% 85%, ${alphaColor(awayColor, 0.22)} 0%, transparent 45%),
      linear-gradient(135deg, ${alphaColor(homeColor, 0.04)} 0%, ${alphaColor(awayColor, 0.04)} 100%),
      #081229
    `
  };

  const Section = ({ title, children }) => (
    <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-3 shadow-md">
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
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — bảng tỉ số kiểu Apple Sports: số to 2 bên, phút/giờ ở giữa, ghi bàn dưới đội */}
        <div className="relative shrink-0 overflow-hidden border-b border-white/5 bg-white/[0.01]">
          <div 
            className="absolute inset-0 transition-opacity duration-500 opacity-60" 
            style={{
              background: `linear-gradient(90deg, ${alphaColor(homeColor, 0.25)} 0%, transparent 40%, transparent 60%, ${alphaColor(awayColor, 0.25)} 100%)`
            }}
          />
          <div className="relative px-4 pt-5 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="text-4xl font-black text-white tabular-nums text-center">
                {match.finished || isLive ? stats?.liveScore?.home ?? match.home.score ?? 0 : ""}
              </span>
              <div className="flex flex-col items-center gap-0.5 px-3 min-w-[64px]">
                {match.finished || isLive ? null : (
                  <span className="text-sm font-black text-white tabular-nums">{vnShortDateTime(match.utcTime)}</span>
                )}
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isLive ? "text-[#ff8a8a]" : "text-white/50"}`}>
                  {isLive ? (stats?.liveMinute || match.liveTime || "Đang đá") : match.finished ? (match.statusShort || "Kết thúc") : "Sắp đá"}
                </span>
                {pen && (
                  <span className="text-[11px] font-black text-[#FFB454] tabular-nums mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    ({pen.home} - {pen.away})
                  </span>
                )}
              </div>
              <span className="text-4xl font-black text-white tabular-nums text-center">
                {match.finished || isLive ? stats?.liveScore?.away ?? match.away.score ?? 0 : ""}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mt-3">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Badge id={match.home.id} name={match.home.name} />
                <span className="text-xs font-bold text-white text-center truncate max-w-full">{match.home.name}</span>
                {stats?.events
                  ?.filter((e) => e.type === "Goal" && e.team === match.home.name)
                  .map((e, i) => (
                    <span key={i} className="text-[10px] text-white/50 font-medium text-center">
                      {e.player} {e.minute != null ? `${e.minute}'` : ""}
                    </span>
                  ))}
              </div>
              <div className="w-[64px] shrink-0" />
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Badge id={match.away.id} name={match.away.name} />
                <span className="text-xs font-bold text-white text-center truncate max-w-full">{match.away.name}</span>
                {stats?.events
                  ?.filter((e) => e.type === "Goal" && e.team === match.away.name)
                  .map((e, i) => (
                    <span key={i} className="text-[10px] text-white/50 font-medium text-center">
                      {e.player} {e.minute != null ? `${e.minute}'` : ""}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        {!(loading && !stats) && (
          <div className="shrink-0 flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-white/5 bg-transparent">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                  tab === t.key 
                    ? "bg-white/10 text-white border border-white/5 shadow-inner" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs text-slate-300">
          {loading && !stats ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {tab === "lineup" &&
                (stats?.lineups ? (
                  <LineupPitch lineups={stats.lineups} homeColor={homeColor} awayColor={awayColor} />
                ) : (
                  <div className="text-center py-10 text-[11px] text-slate-500">Chưa có đội hình ra sân.</div>
                ))}

              {tab === "events" &&
                (stats?.events?.length > 0 ? (
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
                ) : (
                  <div className="text-center py-10 text-[11px] text-slate-500">Chưa có diễn biến trận đấu.</div>
                ))}

              {tab === "stats" && (
                <>
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
                              <div className="flex items-center gap-3 w-full">
                                {/* Left Bar (Home) - Grows right-to-left */}
                                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden flex justify-end">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500 ease-out" 
                                    style={{ 
                                      width: `${pct}%`, 
                                      backgroundColor: homeColor,
                                      boxShadow: `0 0 6px ${homeColor}`
                                    }} 
                                  />
                                </div>
                                
                                {/* Right Bar (Away) - Grows left-to-right */}
                                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden flex justify-start">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500 ease-out" 
                                    style={{ 
                                      width: `${100 - pct}%`, 
                                      backgroundColor: awayColor,
                                      boxShadow: `0 0 6px ${awayColor}`
                                    }} 
                                  />
                                </div>
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
                </>
              )}

              <p className="text-[10px] text-slate-600 text-center font-medium">Nguồn dữ liệu: FotMob</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
