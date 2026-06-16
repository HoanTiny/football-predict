"use client";

import { useState } from "react";
import { flagImgOf } from "@/lib/constants";

/**
 * Lineup theo phong cách Apple Sports:
 *  - Mobile: Tab chọn đội (home/away) dạng pill glassmorphism. Hiển thị 1 sân + subs + coach.
 *  - PC (lg:): Hiển thị cả 2 đội (home & away) song song cạnh nhau, ẩn thanh tab chọn.
 *  - Sân bóng thiết kế kính mờ (glassmorphic tactical board), bo góc tròn mịn, có đủ gôn, vạch 16m50, phạt góc.
 *  - Cầu thủ dạng avatar gradient viền trắng nổi bật, tên + số áo có drop-shadow cực rõ nét.
 */

function nameShort(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  if (/^[A-Z]\.?$/.test(parts[0])) return parts.slice(0, 2).join(" ");
  return parts[0][0] + ". " + parts[parts.length - 1];
}

function initial(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseGrid(grid) {
  if (!grid || !grid.includes(":")) return null;
  const [r, c] = grid.split(":").map((n) => parseInt(n, 10));
  if (isNaN(r) || isNaN(c)) return null;
  return [r, c];
}

/**
 * Bố trí cầu thủ trên sân theo grid của API-Football.
 *  - row 1 = GK -> đáy sân (yPct ~90).
 *  - row cao nhất = tiền đạo -> đỉnh sân (yPct ~14).
 */
function layoutFull(players) {
  const byRow = new Map();
  players.forEach((p) => {
    const g = parseGrid(p.grid);
    const row = g ? g[0] : 1;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ ...p, _col: g ? g[1] : 0 });
  });
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const Y_GK = 90;
  const Y_FW = 14;
  const out = [];
  rows.forEach((row, ri) => {
    const list = byRow.get(row).sort((a, b) => a._col - b._col);
    const yPct =
      rows.length === 1 ? Y_GK : Y_GK - ((Y_GK - Y_FW) * ri) / (rows.length - 1);
    list.forEach((p, idx) => {
      const xPct = ((idx + 1) / (list.length + 1)) * 100;
      out.push({ ...p, leftPct: xPct, topPct: yPct });
    });
  });
  return out;
}

const HOME_COLOR = {
  from: "from-blue-500",
  to: "to-indigo-700",
  shadow: "shadow-blue-900/50",
};
const AWAY_COLOR = {
  from: "from-rose-500",
  to: "to-red-700",
  shadow: "shadow-red-900/50",
};

function PlayerDot({ p, color }) {
  const isGK = p.pos === "G" || p.pos === "GK";
  const subText = isGK ? `🧤 GK · ${p.number}` : p.number;

  return (
    <div
      style={{
        position: "absolute",
        left: `${p.leftPct}%`,
        top: `${p.topPct}%`,
        transform: "translate(-50%, -50%)",
      }}
      className="flex flex-col items-center select-none w-[70px] pointer-events-auto transition-transform hover:scale-105 active:scale-95 cursor-default"
    >
      {/* Avatar Badge */}
      <div
        className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br ${color.from} ${color.to} border-2 border-white/95 text-white font-extrabold text-[12px] md:text-[13px] tracking-wider uppercase flex items-center justify-center shadow-lg ${color.shadow}`}
      >
        {initial(p.name)}
      </div>

      {/* Tên cầu thủ (Có bóng đổ dày để hiển thị tốt trên vạch sân) */}
      <div className="mt-1 text-[10px] md:text-[10.5px] font-bold text-white tracking-wide text-center leading-tight max-w-[72px] truncate drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
        {nameShort(p.name)}
      </div>

      {/* Số áo (và găng tay nếu là thủ môn) */}
      <div className="text-[9px] md:text-[9.5px] font-extrabold text-slate-300 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] uppercase tracking-wider font-mono">
        {subText}
      </div>
    </div>
  );
}

function TeamTab({ team, active, onClick }) {
  const flag = flagImgOf(team?.team);
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200 shrink-0 select-none ${
        active
          ? "bg-white/12 border border-white/20 text-white shadow-lg backdrop-blur-md scale-[1.02]"
          : "bg-white/4 border border-white/5 text-slate-400 hover:bg-white/7 hover:text-white"
      }`}
    >
      {flag && (
        <img
          src={flag}
          alt={team?.team || ""}
          className="w-4.5 h-4.5 rounded-full object-cover border border-white/40 shadow-sm shrink-0"
        />
      )}
      <span className="text-[11px] font-extrabold tracking-wide uppercase font-sans">
        {team?.team} <span className="opacity-40 mx-0.5">·</span> {team?.formation || "—"}
      </span>
    </button>
  );
}

function PitchLines() {
  return (
    <>
      {/* Đường viền sân */}
      <div className="absolute inset-[4%] border border-white/12 rounded-lg pointer-events-none" />

      {/* Vành gôn trên */}
      <div className="absolute left-[38%] right-[38%] top-[1.5%] height-[2.5%] border border-white/12 border-b-0 pointer-events-none" style={{ height: "2.5%" }} />
      {/* Vành gôn dưới */}
      <div className="absolute left-[38%] right-[38%] bottom-[1.5%] height-[2.5%] border border-white/12 border-t-0 pointer-events-none" style={{ height: "2.5%" }} />

      {/* Vạch giữa sân */}
      <div className="absolute top-1/2 left-[4%] right-[4%] h-[1px] bg-white/12 -translate-y-1/2 pointer-events-none" />

      {/* Vòng tròn giữa */}
      <div className="absolute left-1/2 top-1/2 w-[24%] aspect-square rounded-full border border-white/12 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      {/* Chấm giữa sân */}
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/25 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Vòng cấm trên */}
      <div className="absolute top-[4%] left-[23%] right-[23%] h-[12%] border border-white/12 border-t-0 pointer-events-none" />
      {/* Vòng 5m50 trên */}
      <div className="absolute top-[4%] left-[36%] right-[36%] h-[4.5%] border border-white/12 border-t-0 pointer-events-none" />
      {/* Chấm 11m trên */}
      <div className="absolute left-1/2 top-[12.5%] w-1.5 h-1.5 rounded-full bg-white/25 -translate-x-1/2 pointer-events-none" />

      {/* Vòng cấm dưới */}
      <div className="absolute bottom-[4%] left-[23%] right-[23%] h-[12%] border border-white/12 border-b-0 pointer-events-none" />
      {/* Vòng 5m50 dưới */}
      <div className="absolute bottom-[4%] left-[36%] right-[36%] h-[4.5%] border border-white/12 border-b-0 pointer-events-none" />
      {/* Chấm 11m dưới */}
      <div className="absolute left-1/2 bottom-[12.5%] w-1.5 h-1.5 rounded-full bg-white/25 -translate-x-1/2 pointer-events-none" />

      {/* Các góc phạt góc */}
      {/* Top Left */}
      <div className="absolute top-[4%] left-[4%] w-3 h-3 border-r border-b border-white/12 rounded-br-full pointer-events-none" />
      {/* Top Right */}
      <div className="absolute top-[4%] right-[4%] w-3 h-3 border-l border-b border-white/12 rounded-bl-full pointer-events-none" />
      {/* Bottom Left */}
      <div className="absolute bottom-[4%] left-[4%] w-3 h-3 border-r border-t border-white/12 rounded-tr-full pointer-events-none" />
      {/* Bottom Right */}
      <div className="absolute bottom-[4%] right-[4%] w-3 h-3 border-l border-t border-white/12 rounded-tl-full pointer-events-none" />
    </>
  );
}

function SingleTeamPitch({ team, color, isHome }) {
  const dots = layoutFull(team.startXI || []);

  return (
    <div className="space-y-4">
      {/* Sân Sa Bàn */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4.2",
          borderRadius: 22,
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 12px 30px rgba(0, 0, 0, 0.3)",
        }}
        className="backdrop-blur-sm select-none"
      >
        {/* Vạch kẻ sân tactical */}
        <PitchLines />

        {/* Cầu thủ xuất phát */}
        {dots.map((p, i) => (
          <PlayerDot key={`${team.team}-${i}`} p={p} color={color} />
        ))}
      </div>

      {/* Danh Sách Dự Bị (Subs) */}
      {team.substitutes && team.substitutes.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-md">
          {/* Header Sub */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
              Danh sách dự bị
            </span>
            <span className="text-[9px] text-[#62F2C0] font-black uppercase tracking-widest font-mono">
              Subs · {team.substitutes.length}
            </span>
          </div>

          {/* List players */}
          <ul className="m-0 p-0 list-none divide-y divide-white/5">
            {team.substitutes.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-4 px-4 py-2 text-xs hover:bg-white/[0.02] transition-colors"
              >
                {/* Số áo */}
                <span className="w-5 font-black text-slate-400 text-right tabular-nums text-[11px] font-mono">
                  {p.number ?? "—"}
                </span>
                {/* Tên */}
                <span className="font-semibold text-white truncate flex-1 font-sans">
                  {p.name}
                </span>
                {/* Vị trí */}
                {p.pos && (
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                    {p.pos === "G" ? "GK" : p.pos === "D" ? "DF" : p.pos === "M" ? "MF" : p.pos === "F" ? "FW" : p.pos}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Huấn Luyện Viên */}
      {team.coach && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between backdrop-blur-md text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
            Huấn luyện viên
          </span>
          <span className="text-white font-bold font-sans">{team.coach}</span>
        </div>
      )}
    </div>
  );
}

export default function LineupPitch({ lineups }) {
  const [side, setSide] = useState("home");
  if (!lineups || !lineups.home || !lineups.away) return null;

  return (
    <div
      style={{
        background: "radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.28) 0%, transparent 60%), radial-gradient(circle at 85% 15%, rgba(239, 68, 68, 0.28) 0%, transparent 60%), linear-gradient(180deg, #0d132b 0%, #050710 100%)",
      }}
      className="w-full rounded-2xl p-4 md:p-5 border border-white/10 shadow-2xl relative space-y-4"
    >
      {/* Header labels */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          Đội hình ra sân
        </span>
        <span className="text-[9px] text-[#62F2C0] font-black uppercase tracking-widest font-mono">
          Starting Lineup
        </span>
      </div>

      {/* Team Tabs (Toggles) - Chỉ hiển thị trên mobile, ẩn trên PC */}
      <div className="flex lg:hidden items-center justify-center gap-3 py-1">
        <TeamTab
          team={lineups.home}
          active={side === "home"}
          onClick={() => setSide("home")}
        />
        <TeamTab
          team={lineups.away}
          active={side === "away"}
          onClick={() => setSide("away")}
        />
      </div>

      {/* Sân bóng & Dự bị Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start w-full">
        {/* Home Team Column */}
        <div className={side === "home" ? "block" : "hidden lg:block"}>
          {/* Tên Đội & Sơ Đồ cho Desktop */}
          <div className="hidden lg:flex items-center gap-2 mb-3 px-2">
            <span className="text-white font-extrabold text-sm uppercase tracking-wide">
              {lineups.home?.team}
            </span>
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/35 px-2 py-0.5 rounded-full text-blue-400 font-extrabold font-mono">
              {lineups.home?.formation}
            </span>
          </div>
          <SingleTeamPitch team={lineups.home} color={HOME_COLOR} isHome={true} />
        </div>

        {/* Away Team Column */}
        <div className={side === "away" ? "block" : "hidden lg:block"}>
          {/* Tên Đội & Sơ Đồ cho Desktop */}
          <div className="hidden lg:flex items-center gap-2 mb-3 px-2">
            <span className="text-white font-extrabold text-sm uppercase tracking-wide">
              {lineups.away?.team}
            </span>
            <span className="text-[10px] bg-rose-500/10 border border-rose-500/35 px-2 py-0.5 rounded-full text-rose-400 font-extrabold font-mono">
              {lineups.away?.formation}
            </span>
          </div>
          <SingleTeamPitch team={lineups.away} color={AWAY_COLOR} isHome={false} />
        </div>
      </div>
    </div>
  );
}

