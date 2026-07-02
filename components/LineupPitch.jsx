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

/** Avatar: ảnh cầu thủ (FotMob) nếu có, tự fallback về chữ viết tắt khi ảnh lỗi/thiếu. */
function PlayerAvatar({ photo, name, color, size }) {
  const [errored, setErrored] = useState(false);
  const isHex = typeof color === "string" && color.startsWith("#");
  
  const bgStyle = isHex 
    ? { 
        backgroundColor: color,
        border: "2px solid rgba(255, 255, 255, 0.95)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
      }
    : {};

  return (
    <div
      className={`${size} rounded-full text-white font-extrabold text-[13px] md:text-[14px] lg:text-[15px] tracking-wider uppercase flex items-center justify-center overflow-hidden ${
        isHex ? "shadow-lg" : `bg-gradient-to-br ${color.from} ${color.to} border-2 border-white/95 ${color.shadow} shadow-lg`
      }`}
      style={bgStyle}
    >
      {photo && !errored ? (
        <img
          src={photo}
          alt={name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initial(name)
      )}
    </div>
  );
}

// Màu badge điểm theo thang FotMob: ≥7.5 rất tốt, ≥7 tốt, ≥6 khá, <6 kém.
function ratingClass(r) {
  if (r >= 7.5) return "bg-emerald-500";
  if (r >= 7) return "bg-green-600";
  if (r >= 6) return "bg-amber-500";
  return "bg-rose-600";
}

/** Icon bàn thắng / thẻ vàng / thẻ đỏ của 1 cầu thủ (null nếu không có gì). */
function GoalCardIcons({ p }) {
  if (!p?.goals && !p?.yellow && !p?.red) return null;
  return (
    <>
      {p.goals > 0 && (
        <span title="Bàn thắng">⚽{p.goals > 1 ? p.goals : ""}</span>
      )}
      {p.yellow && <span title="Thẻ vàng">🟨</span>}
      {p.red && <span title="Thẻ đỏ">🟥</span>}
    </>
  );
}

function PlayerDot({ p, color, onSelect }) {
  const isGK = p.pos === "G" || p.pos === "GK";
  const subText = isGK ? `🧤 GK · ${p.number}` : p.number;

  return (
    <div
      onClick={() => onSelect?.(p)}
      style={{
        position: "absolute",
        left: `${p.leftPct}%`,
        top: `${p.topPct}%`,
        transform: "translate(-50%, -50%)",
      }}
      className="flex flex-col items-center select-none w-[80px] lg:w-[100px] pointer-events-auto transition-transform hover:scale-105 active:scale-95 cursor-pointer"
    >
      {/* Avatar Badge (ảnh hoặc chữ viết tắt) + điểm số (nếu có) */}
      <div className="relative">
        <PlayerAvatar
          photo={p.photo}
          name={p.name}
          color={color}
          size="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12"
        />
        {p.rating != null && (
          <span
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] font-black text-white tabular-nums px-1 py-px rounded shadow-md border border-black/20 ${ratingClass(p.rating)}`}
          >
            {p.rating.toFixed(1)}
          </span>
        )}
        {/* Bàn thắng / thẻ / ra sân — góc trên phải avatar */}
        <span className="absolute -top-1.5 -right-2 flex items-center gap-0.5 text-[10px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <GoalCardIcons p={p} />
          {p.subOut != null && (
            <span title={`Rời sân ${p.subOut}'`} className="text-rose-400 font-black">↓</span>
          )}
        </span>
      </div>

      {/* Tên cầu thủ (Có bóng đổ dày để hiển thị tốt trên vạch sân) */}
      <div className="mt-2.5 text-[11px] md:text-[11.5px] lg:text-[12px] font-bold text-white tracking-wide text-center leading-tight max-w-[80px] lg:max-w-[100px] truncate drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
        {nameShort(p.name)}
      </div>

      {/* Số áo (và găng tay nếu là thủ môn) */}
      <div className="text-[10px] md:text-[10.5px] lg:text-[11px] font-extrabold text-slate-300 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] uppercase tracking-wider font-mono">
        {subText}
      </div>
    </div>
  );
}

function TeamTab({ team, active, color, onClick }) {
  const flag = flagImgOf(team?.team);
  const isHex = typeof color === "string" && color.startsWith("#");
  
  const activeStyle = active && isHex
    ? {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderColor: color,
        boxShadow: `0 0 10px ${color}33`,
      }
    : {};

  return (
    <button
      onClick={onClick}
      style={activeStyle}
      className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 shrink-0 min-w-0 select-none border ${
        active
          ? isHex 
            ? "text-white scale-[1.02]" 
            : "bg-white/12 border-white/20 text-white shadow-lg backdrop-blur-md scale-[1.02]"
          : "bg-white/4 border-white/5 text-slate-400 hover:bg-white/7 hover:text-white"
      }`}
    >
      {flag && (
        <img
          src={flag}
          alt={team?.team || ""}
          className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full object-cover border border-white/40 shadow-sm shrink-0"
        />
      )}
      <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wide uppercase font-sans truncate">
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

function SingleTeamPitch({ team, color, onSelect }) {
  const dots = layoutFull(team.startXI || []);

  return (
    <div className="space-y-4">
      {/* Sân Sa Bàn */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 3.6",
          maxHeight: "62vh",
          maxWidth: "calc(62vh * 3 / 3.6)",
          borderRadius: 22,
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 12px 30px rgba(0, 0, 0, 0.3)",
        }}
        className="backdrop-blur-sm select-none mx-auto"
      >
        {/* Vạch kẻ sân tactical */}
        <PitchLines />

        {/* Cầu thủ xuất phát */}
        {dots.map((p, i) => (
          <PlayerDot key={`${team.team}-${i}`} p={p} color={color} onSelect={onSelect} />
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
            {team.substitutes.map((p, i) => {
              const posLabel =
                p.pos === "G" ? "GK" : p.pos === "D" ? "DF" : p.pos === "M" ? "MF" : p.pos === "F" ? "FW" : p.pos;
              return (
                <li
                  key={i}
                  onClick={() => onSelect?.(p)}
                  className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  {/* Avatar nhỏ + điểm (nếu đã vào sân & được chấm) */}
                  <div className="relative shrink-0">
                    <PlayerAvatar photo={p.photo} name={p.name} color={color} size="w-8 h-8" />
                    {p.rating != null && (
                      <span
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-white tabular-nums px-0.5 rounded border border-black/20 ${ratingClass(p.rating)}`}
                      >
                        {p.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {/* Tên + bàn thắng/thẻ, và phút vào sân / vị trí */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white truncate font-sans">{p.name}</span>
                      <span className="flex items-center gap-0.5 text-[10px] leading-none shrink-0">
                        <GoalCardIcons p={p} />
                      </span>
                    </div>
                    <div className="text-[9px] font-bold mt-0.5">
                      {p.subIn != null ? (
                        <span className="text-emerald-400">↑ Vào sân {p.subIn}&#39;</span>
                      ) : (
                        <span className="text-slate-500 uppercase tracking-widest font-mono">{posLabel}</span>
                      )}
                    </div>
                  </div>
                  {/* Số áo */}
                  <span className="font-black text-slate-500 text-right tabular-nums text-[11px] font-mono shrink-0">
                    #{p.number ?? "—"}
                  </span>
                </li>
              );
            })}
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

/** Popup thống kê 1 cầu thủ khi click (kèm link tìm Google). */
function PlayerStatsCard({ entry, onClose }) {
  const { player: p, team, color } = entry;
  const q = encodeURIComponent(`${p.name} ${team || ""} cầu thủ`.trim());
  const posLabel =
    p.pos === "G" ? "Thủ môn" : p.pos === "D" ? "Hậu vệ" : p.pos === "M" ? "Tiền vệ" : p.pos === "F" ? "Tiền đạo" : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0B1735] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <PlayerAvatar photo={p.photo} name={p.name} color={color} size="w-12 h-12" />
          <div className="min-w-0">
            <div className="text-white font-bold text-base truncate">{p.name}</div>
            <div className="text-slate-400 text-[11px] truncate">
              {team}
              {p.number ? ` · #${p.number}` : ""}
              {posLabel ? ` · ${posLabel}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2 L12 12 M12 2 L2 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto scrollbar-thin">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Thống kê về trận đấu
          </div>
          {p.rating != null && (
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-semibold text-white">Điểm xếp hạng cầu thủ</div>
                <div className="text-[10px] text-slate-500">Dựa trên dữ liệu trận đấu</div>
              </div>
              <span className={`text-sm font-black text-white tabular-nums px-2 py-0.5 rounded ${ratingClass(p.rating)}`}>
                {p.rating.toFixed(1)}
              </span>
            </div>
          )}
          {p.details && p.details.length > 0 ? (
            <div className="divide-y divide-white/5 border-t border-white/5">
              {p.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-300">{d.label}</span>
                  <span className="text-white font-bold tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic py-3 text-center">
              Cầu thủ chưa ra sân — chưa có thống kê.
            </div>
          )}
        </div>

        {/* Link tìm Google */}
        <a
          href={`https://www.google.com/search?q=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-3 border-t border-white/10 text-[#7b8fff] hover:text-white hover:bg-white/[0.03] text-xs font-bold transition-colors"
        >
          🔍 Xem thêm về {p.name}
        </a>
      </div>
    </div>
  );
}

export default function LineupPitch({ lineups, homeColor, awayColor }) {
  const [side, setSide] = useState("home");
  const [selected, setSelected] = useState(null);
  if (!lineups || !lineups.home || !lineups.away) return null;

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

  const pitchHome = homeColor || "#3b82f6";
  const pitchAway = awayColor || "#ef4444";

  const containerStyle = {
    background: `
      radial-gradient(circle at 15% 15%, ${alphaColor(pitchHome, 0.16)} 0%, transparent 60%),
      radial-gradient(circle at 85% 15%, ${alphaColor(pitchAway, 0.16)} 0%, transparent 60%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.02) 100%),
      #081229
    `
  };

  const predicted = lineups.predicted;
  const pickPlayer = (p) =>
    setSelected({
      player: p,
      team: lineups[side]?.team,
      color: side === "home" ? (homeColor || HOME_COLOR) : (awayColor || AWAY_COLOR),
    });

  return (
    <div
      style={containerStyle}
      className="w-full rounded-2xl p-4 md:p-5 border border-white/10 shadow-2xl relative space-y-4"
    >
      {/* Header labels */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <span className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {predicted ? "Đội hình dự kiến" : "Đội hình ra sân"}
          {predicted && (
            <span className="normal-case tracking-normal text-[9px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5">
              chưa chính thức
            </span>
          )}
        </span>
        <span className="text-[9px] text-[#62F2C0] font-black uppercase tracking-widest font-mono">
          {predicted ? "Predicted XI" : "Starting Lineup"}
        </span>
      </div>

      {/* Team Tabs (Toggles) - Apple Sports style: luôn hiển thị, ở giữa */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-1 w-full">
        <TeamTab
          team={lineups.home}
          active={side === "home"}
          color={homeColor}
          onClick={() => setSide("home")}
        />
        <TeamTab
          team={lineups.away}
          active={side === "away"}
          color={awayColor}
          onClick={() => setSide("away")}
        />
      </div>

      {/* Sân bóng — 1 sân duy nhất, căn giữa, giới hạn chiều rộng trên PC */}
      <div className="mx-auto w-full max-w-[460px] lg:max-w-[620px]">
        {side === "home" ? (
          <SingleTeamPitch team={lineups.home} color={homeColor || HOME_COLOR} isHome={true} onSelect={pickPlayer} />
        ) : (
          <SingleTeamPitch team={lineups.away} color={awayColor || AWAY_COLOR} isHome={false} onSelect={pickPlayer} />
        )}
      </div>

      {/* Popup thống kê cầu thủ */}
      {selected && <PlayerStatsCard entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

