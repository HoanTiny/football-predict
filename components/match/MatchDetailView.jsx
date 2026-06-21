"use client";

import { useState } from "react";
import { teamLogo } from "@/lib/leagues";
import LineupPitch from "../LineupPitch";

// ── Khối dựng dùng chung cho mọi UI chi tiết trận (BetModal & MatchDetailSheet) ──
// Một nguồn sự thật: danh sách thống kê, thanh %, phong độ, icon diễn biến.

// Thống kê hiển thị (theo thứ tự) → nhãn tiếng Việt. Key khớp shape FotMob/API-Football.
export const STAT_ROWS = [
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

export const statPct = (h, a) => {
  const num = (v) => (typeof v === "string" ? parseFloat(v) : v) || 0;
  const H = num(h), A = num(a);
  return H + A ? Math.round((H / (H + A)) * 100) : 50;
};

export const eventIcon = (e) => {
  if (e.type === "Goal") return "⚽";
  if (e.type === "Card") return (e.detail || "").includes("Red") ? "🟥" : "🟨";
  if (e.type === "subst") return "🔁";
  return "•";
};

export const FormPips = ({ form = [], align = "start" }) => (
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

const TeamBadge = ({ id, name, size = "sm" }) => {
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

const Section = ({ title, children }) => (
  <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{title}</span>
    {children}
  </div>
);

const LineupBlock = ({ stats }) =>
  stats?.lineups ? (
    <LineupPitch lineups={stats.lineups} />
  ) : (
    <Section title="Đội hình ra sân">
      <div className="text-[11px] text-slate-500 text-center py-2">
        Đội chưa công bố đội hình xuất phát.{" "}
        <span className="text-slate-400">Thường có ~60 phút trước giờ bóng lăn.</span>
      </div>
    </Section>
  );

/**
 * Nội dung chi tiết trận (CHỈ ĐỌC): đội hình + diễn biến + thống kê + phong độ + sân + H2H.
 * Dùng chung shape `stats` từ /api/match-stats hoặc /api/leagues/match.
 * props: { stats, loading, home:{id,name}, away:{id,name}, isLive, lineupOnly, showLineup }
 */
export default function MatchDetailView({ stats, loading, home, away, isLive, lineupOnly = false, showLineup = true }) {
  if (lineupOnly) return <LineupBlock stats={stats} />;

  const homeForm = stats?.form?.home || [];
  const awayForm = stats?.form?.away || [];

  return (
    <>
      {showLineup && <LineupBlock stats={stats} />}

      {stats?.events?.length > 0 && (
        <Section title="Diễn biến chính">
          <div className="space-y-1.5">
            {stats.events.map((e, i) => {
              const isHome = e.team === home?.name;
              return (
                <div key={i} className={`flex items-center gap-2 text-[11px] ${isHome ? "" : "flex-row-reverse text-right"}`}>
                  <span className="tabular-nums text-slate-500 w-7 shrink-0">{e.minute != null ? `${e.minute}'` : ""}</span>
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
            <TeamBadge id={home?.id} name={home?.name} />
            <span className="font-bold text-white truncate text-xs">{home?.name}</span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 px-2 shrink-0">VS</span>
          <div className="flex items-center gap-1.5 justify-end min-w-0">
            <span className="font-bold text-white truncate text-xs text-right">{away?.name}</span>
            <TeamBadge id={away?.id} name={away?.name} />
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
              <div key={i} className={`flex flex-col gap-1 ${i < stats.h2h.length - 1 ? "pb-2.5 border-b border-white/5" : ""}`}>
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
  );
}
