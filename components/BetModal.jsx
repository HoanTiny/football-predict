"use client";

import { useState, useEffect } from "react";
import {
  flagOf,
  flagImgOf,
  fmt,
  matchIsLive,
  BET_TYPES,
  betLabel,
} from "@/lib/constants";
import { vnTime, vnDateHeader } from "@/lib/time";
import {
  calculateGroupStandings,
  getTeamGroup,
  normalizeTeamName,
} from "@/lib/standings";
import { getFifaRank } from "@/lib/fifaRankings";
import { scoreMultiplier, wdlMultiplier } from "@/lib/settlement";
import LineupPitch from "./LineupPitch";

function formatSlotName(code) {
  if (!code) return "TBD";
  const m1 = /^([123])([A-L])$/.exec(code);
  if (m1) {
    const pos = m1[1] === "1" ? "Nhất" : m1[1] === "2" ? "Nhì" : "Hạng 3";
    return `${pos} bảng ${m1[2]} (${code})`;
  }
  const m2 = /^([123])([A-L]+)$/.exec(code);
  if (m2) {
    const pos =
      m2[1] === "1" ? "Nhất" : m2[1] === "2" ? "Nhì" : "Top 3 các bảng";
    return `${pos} (${code})`;
  }
  return code;
}

/** Phong độ thật trong giải: lấy từ các trận ĐÃ ĐÁ của đội trong dataset. */
function localForm(matches, teamName) {
  if (!matches?.length || !teamName) return [];
  const norm = normalizeTeamName(teamName);
  return matches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.score?.fullTime?.home != null &&
        (normalizeTeamName(m.homeTeam?.name) === norm ||
          normalizeTeamName(m.awayTeam?.name) === norm),
    )
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
    .slice(-5)
    .map((m) => {
      const isHome = normalizeTeamName(m.homeTeam?.name) === norm;
      const gf = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const ga = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      return gf > ga ? "W" : gf < ga ? "L" : "D";
    });
}

/** Hạng hiện tại trong bảng World Cup (thật). null nếu chưa xác định. */
function groupRank(matches, teamName) {
  const group = getTeamGroup(teamName);
  if (!group || !matches?.length) return null;
  const standings = calculateGroupStandings(matches, group, null, false);
  const norm = normalizeTeamName(teamName);
  const idx = standings.findIndex((t) => normalizeTeamName(t.name) === norm);
  return idx >= 0 ? { group, pos: idx + 1 } : null;
}

const FormPips = ({ form, align = "start" }) => (
  <div
    className={`flex gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}
  >
    {form.length === 0 ? (
      <span className="text-[10px] text-slate-500">—</span>
    ) : (
      form.map((char, idx) => (
        <span
          key={idx}
          className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white ${
            char === "W"
              ? "bg-emerald-500"
              : char === "L"
                ? "bg-rose-500"
                : "bg-slate-500"
          }`}
        >
          {char}
        </span>
      ))
    )}
  </div>
);

// Icon cho diễn biến trận
const eventIcon = (e) => {
  if (e.type === "Goal") return "⚽";
  if (e.type === "Card") return (e.detail || "").includes("Red") ? "🟥" : "🟨";
  if (e.type === "subst") return "🔁";
  return "•";
};

// Thống kê hiển thị (theo thứ tự) → nhãn tiếng Việt
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

// % cho thanh so sánh (xử lý cả "55%" lẫn số)
const statPct = (h, a) => {
  const num = (v) => (typeof v === "string" ? parseFloat(v) : v) || 0;
  const H = num(h),
    A = num(a);
  return H + A ? Math.round((H / (H + A)) * 100) : 50;
};

const renderModalFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[13px] leading-none">
      {flagOf(teamName)}
    </div>
  );
};

function ScoreButton({ value, onChange, label, renderFlag }) {
  const isSelected = value > 0;
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full shadow-inner max-w-[140px] justify-center">
        {renderFlag && renderFlag(label)}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 truncate">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white active:scale-90 border border-white/10 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12h-15"
            />
          </svg>
        </button>
        <div
          className={`w-14 h-16 rounded-2xl flex items-center justify-center text-3xl font-black tabular-nums transition-all duration-200 ${
            isSelected
              ? "bg-gradient-to-b from-[#334BFF]/50 to-[#334BFF]/10 border-[#334BFF] text-white shadow-[0_0_15px_rgba(51,75,255,0.4)]"
              : "bg-gradient-to-b from-white/[0.06] to-transparent border-white/10 text-slate-400"
          } border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white active:scale-90 border border-white/10 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function BetModal({
  match,
  chips,
  onConfirm,
  onClose,
  roomBets,
  prediction,
  initialTab,
  matches,
}) {
  const canEdit = match.status === "SCHEDULED" || match.status === "TIMED";
  const [modalTab, setModalTab] = useState(
    initialTab === "friends" && (!roomBets || roomBets.length === 0)
      ? canEdit
        ? "predict"
        : "stats"
      : initialTab || (canEdit ? "predict" : "stats"),
  );
  const homeName =
    match.homeTeam?.name ||
    formatSlotName(match.code?.home || match.slot?.home);
  const awayName =
    match.awayTeam?.name ||
    formatSlotName(match.code?.away || match.slot?.away);

  const firstPred = Array.isArray(prediction) ? prediction[0] : prediction;
  const [home, setHome] = useState(firstPred?.homeGoals ?? 0);
  const [away, setAway] = useState(firstPred?.awayGoals ?? 0);
  const maxWager = Math.max(10, chips);
  const [wager, setWager] = useState(firstPred?.wager ?? Math.min(50, chips));
  // Loại kèo + lựa chọn (Tài/Xỉu, BTTS, Chẵn/Lẻ); mặc định kèo tỉ số.
  const [betType, setBetType] = useState("score");
  const [selection, setSelection] = useState(null);
  const selectionOk =
    betType === "score" ? home >= 0 && away >= 0 : !!selection;
  const valid = chips >= 10 && wager >= 10 && wager <= chips && selectionOk;
  // Hệ số thưởng kèo tỉ số theo tỉ số đang chọn (cược cửa dưới thắng → ×cao hơn).
  const scoreMult = scoreMultiplier(home, away, homeName, awayName);
  // Hệ số kèo 1X2 theo lựa chọn (Hòa ×2, cửa dưới ×3, cửa trên ×1).
  const wdlMult = selection ? wdlMultiplier(selection, homeName, awayName) : 1;

  // Hạng FIFA thế giới (bảng tĩnh cập nhật tay) + hạng trong bảng World Cup
  const homeFifa = getFifaRank(homeName);
  const awayFifa = getFifaRank(awayName);
  const homeRankInfo = groupRank(matches, homeName);
  const awayRankInfo = groupRank(matches, awayName);

  // Dữ liệu thật từ API (phong độ + H2H + thời tiết + thống kê/diễn biến live)
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const liveNow = matchIsLive(match);
  useEffect(() => {
    if (modalTab !== "stats" && modalTab !== "lineup") return;
    let active = true;
    const load = (silent) => {
      if (!silent) setStatsLoading(true);
      const qs = new URLSearchParams({
        home: homeName || "",
        away: awayName || "",
        venue: match.venue || "",
        date: match.utcDate || "",
        fixtureId: match.id != null ? String(match.id) : "",
      });
      return fetch(`/api/match-stats?${qs}`)
        .then((r) => r.json())
        .then((d) => active && setStats(d))
        .catch(
          () =>
            active &&
            !silent &&
            setStats({
              form: { home: [], away: [] },
              h2h: [],
              weather: null,
              events: [],
              matchStats: null,
            }),
        )
        .finally(() => active && !silent && setStatsLoading(false));
    };
    load(false);
    // Trận đang diễn ra → poll 30s để cập nhật tỉ số/diễn biến/thống kê
    const timer = liveNow ? setInterval(() => load(true), 30000) : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [
    modalTab,
    homeName,
    awayName,
    match.venue,
    match.utcDate,
    match.id,
    liveNow,
  ]);

  // Phong độ: ưu tiên API-Football, fallback phong độ giải đấu (trận đã đá thật)
  const homeForm = stats?.form?.home?.length
    ? stats.form.home
    : localForm(matches, homeName);
  const awayForm = stats?.form?.away?.length
    ? stats.form.away
    : localForm(matches, awayName);

  // Tỉ lệ lựa chọn cộng đồng (Thắng/Hoà/Thua) — chỉ tính kèo TỈ SỐ (loại khác không map được)
  const allBets = roomBets || [];
  const communityDist = (() => {
    const scoreBets = allBets.filter(
      (b) => (b.betType || "score") === "score" && b.homeGoals != null,
    );
    if (!scoreBets.length) return null;
    let h = 0,
      d = 0,
      a = 0;
    scoreBets.forEach((b) => {
      if (b.homeGoals > b.awayGoals) h++;
      else if (b.homeGoals < b.awayGoals) a++;
      else d++;
    });
    const total = h + d + a || 1;
    return {
      total,
      home: Math.round((h / total) * 100),
      draw: Math.round((d / total) * 100),
      away: Math.round((a / total) * 100),
    };
  })();

  const referee = match.referees?.[0]?.name || null;

  // Tỉ số để gộp thẳng vào header (tránh lặp tên đội ở thẻ riêng).
  // Khi đang đá, tỉ số football-data thường trễ 1-2' → ưu tiên liveScore từ FotMob nếu có.
  const ft = match.score?.fullTime || {};
  const dispHome = stats?.liveScore?.home ?? ft.home;
  const dispAway = stats?.liveScore?.away ?? ft.away;
  const hasScore =
    dispHome != null &&
    dispAway != null &&
    (liveNow || match.status === "FINISHED");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full glass-strong rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 flex flex-col max-h-[92vh] ${
          modalTab === "stats" || modalTab === "lineup"
            ? "max-w-6xl"
            : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glows */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#334BFF]/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-[#62F2C0]/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M2 2 L12 12 M12 2 L2 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-4 relative z-10 border-b border-white/5 pb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {vnDateHeader(match.utcDate)} · {vnTime(match.utcDate)}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wider w-full mt-2">
            <div className="flex items-center justify-end gap-2 text-right min-w-0">
              <span className="truncate">{homeName}</span>
              {renderModalFlag(homeName)}
            </div>
            {hasScore ? (
              <div className="flex flex-col items-center shrink-0 px-2 normal-case tracking-normal">
                <span className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none">
                  {dispHome} - {dispAway}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${liveNow ? "text-[#ff5a5a]" : "text-slate-500"}`}
                >
                  {match.status === "FINISHED"
                    ? "Kết thúc"
                    : match.minute
                      ? `🔴 Trực tiếp ${match.minute}'`
                      : stats?.liveMinute
                        ? `🔴 ${stats.liveMinute}`
                        : "🔴 Trực tiếp"}
                </span>
              </div>
            ) : (
              <span className="text-xs font-black text-[#334BFF] px-2 shrink-0">
                VS
              </span>
            )}
            <div className="flex items-center justify-start gap-2 text-left min-w-0">
              {renderModalFlag(awayName)}
              <span className="truncate">{awayName}</span>
            </div>
          </div>

          {/* Modal Tabs */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 overflow-x-auto scrollbar-none max-w-full pb-1">
            <button
              onClick={() => setModalTab("predict")}
              className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                modalTab === "predict"
                  ? "bg-[#334BFF] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dự đoán
            </button>
            {roomBets && roomBets.length > 0 && (
              <button
                onClick={() => setModalTab("friends")}
                className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                  modalTab === "friends"
                    ? "bg-[#334BFF] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Bạn bè ({roomBets.length})
              </button>
            )}
            <button
              onClick={() => setModalTab("lineup")}
              className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                modalTab === "lineup"
                  ? "bg-[#334BFF] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Đội hình
            </button>
            <button
              onClick={() => setModalTab("stats")}
              className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                modalTab === "stats"
                  ? "bg-[#334BFF] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Chi tiết trận đấu
            </button>
          </div>
        </div>

        {/* Tab 1: Predict Form */}
        {modalTab === "predict" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-3.5 pb-2">
            {!canEdit ? (
              <div className="bg-[#0B1735]/40 border border-white/5 rounded-xl p-6 text-center space-y-4">
                <span className="text-3xl block">🔒</span>
                <div className="text-sm font-bold text-white">
                  Đã Khóa Dự Đoán
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Trận đấu này đã bắt đầu hoặc kết thúc. Bạn không thể tạo hoặc
                  chỉnh sửa dự đoán nữa.
                </p>
                {prediction && prediction.length > 0 ? (
                  <div className="space-y-2.5 max-w-xs mx-auto w-full">
                    <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wider block">
                      Dự đoán của bạn ({prediction.length})
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prediction.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="inline-flex flex-col items-center gap-1 bg-[#334BFF]/10 border border-[#334BFF]/25 rounded-xl px-4 py-2 shrink-0"
                        >
                          <span className="text-sm font-black text-white">
                            {betLabel(p)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            Đặt cược: 💎{p.wager}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    Bạn đã không đặt cược cho trận đấu này.
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold mt-2"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {/* Chọn loại kèo — segmented control */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/25 border border-white/5">
                  {Object.entries(BET_TYPES)
                    .filter(([key]) => key !== "ou")
                    .map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setBetType(key);
                        setSelection(null);
                      }}
                      className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                        betType === key
                          ? "bg-gradient-to-b from-[#4257ff] to-[#2a3ad9] text-white shadow-lg shadow-[#334BFF]/30"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {cfg.short}
                    </button>
                  ))}
                </div>

                {/* Picker theo loại kèo */}
                {betType === "score" ? (
                  <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 py-4 px-2">
                    <ScoreButton
                      value={home}
                      onChange={setHome}
                      label={homeName}
                      renderFlag={renderModalFlag}
                    />
                    <div className="text-2xl font-black text-slate-600 self-center mt-5">
                      :
                    </div>
                    <ScoreButton
                      value={away}
                      onChange={setAway}
                      label={awayName}
                      renderFlag={renderModalFlag}
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {BET_TYPES[betType].label}
                    </div>
                    <div
                      className={`grid gap-3 ${betType === "1x2" ? "grid-cols-3" : "grid-cols-2"}`}
                    >
                      {BET_TYPES[betType].options.map((opt) => {
                        const active = selection === opt.value;
                        // 1X2: thay nhãn "Đội nhà/khách" bằng tên đội thật cho dễ hiểu
                        const label =
                          betType === "1x2" && opt.value === "HOME"
                            ? homeName
                            : betType === "1x2" && opt.value === "AWAY"
                              ? awayName
                              : opt.label;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setSelection(opt.value)}
                            className={`relative py-4 px-1 rounded-2xl text-sm font-bold transition-all border-2 truncate ${
                              active
                                ? "bg-gradient-to-b from-[#334BFF]/30 to-[#334BFF]/[0.06] border-[#334BFF] text-white shadow-lg shadow-[#334BFF]/20"
                                : "bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/25 hover:text-white"
                            }`}
                          >
                            {active && (
                              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#62F2C0] shadow-[0_0_8px_#62F2C0]" />
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Existing predictions list */}
                {prediction && prediction.length > 0 && (
                  <div className="bg-[#0B1735]/40 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wide block">
                      Các cược đã chốt cho trận này ({prediction.length})
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prediction.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="inline-flex items-center gap-2 bg-[#334BFF]/10 border border-[#334BFF]/25 px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0"
                        >
                          <span>{betLabel(p)}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[#62F2C0] font-bold">
                            💎{fmt(p.wager)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Khối tiền cược */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      Tiền cược
                    </span>
                    <span className="text-slate-400">
                      Số dư{" "}
                      <span className="font-bold text-[#62F2C0]">
                        💎 {fmt(chips)}
                      </span>
                    </span>
                  </div>

                  {/* Ô nhập số tiền cược */}
                  <div className="relative flex items-center justify-between rounded-2xl bg-black/40 border border-white/10 px-4 py-3 focus-within:border-[#334BFF] focus-within:shadow-[0_0_15px_rgba(51,75,255,0.2)] transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl animate-pulse">💎</span>
                      <input
                        type="number"
                        min="10"
                        max={chips}
                        value={wager || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setWager(isNaN(val) ? 0 : val);
                        }}
                        onBlur={() =>
                          setWager(Math.max(10, Math.min(chips, wager || 10)))
                        }
                        className="w-28 bg-transparent text-left text-3xl font-black text-white tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setWager(chips)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest text-[#62F2C0] bg-[#62F2C0]/10 hover:bg-[#62F2C0]/20 border border-[#62F2C0]/20 transition-all uppercase"
                    >
                      Tối đa
                    </button>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max={maxWager}
                    step="10"
                    value={wager}
                    onChange={(e) => setWager(parseInt(e.target.value, 10))}
                    className="premium-slider my-2"
                    style={{
                      background: `linear-gradient(to right, #62F2C0 0%, #62F2C0 ${maxWager > 10 ? ((wager - 10) / (maxWager - 10)) * 100 : 0}%, rgba(255, 255, 255, 0.1) ${maxWager > 10 ? ((wager - 10) / (maxWager - 10)) * 100 : 0}%, rgba(255, 255, 255, 0.1) 100%)`,
                    }}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 200].map((v) => {
                      const disabled = v > chips;
                      const active = wager === v;
                      return (
                        <button
                          key={v}
                          disabled={disabled}
                          type="button"
                          onClick={() => setWager(Math.min(chips, v))}
                          className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                            active
                              ? "bg-[#334BFF]/20 border border-[#334BFF] text-[#7b8fff] shadow-[0_0_10px_rgba(51,75,255,0.25)]"
                              : disabled
                                ? "bg-white/[0.01] border border-white/5 text-slate-700 cursor-not-allowed"
                                : "bg-white/[0.04] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          {fmt(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bảng thưởng */}
                <div className="space-y-2">
                  {betType === "score" ? (
                    <div
                      className={`p-3 rounded-2xl relative overflow-hidden flex flex-col gap-1.5 bg-gradient-to-b ${
                        scoreMult > 3
                          ? "from-[#FFB454]/15 to-[#FFB454]/[0.02] border border-[#FFB454]/30"
                          : "from-[#62F2C0]/10 to-[#62F2C0]/[0.02] border border-[#62F2C0]/15"
                      }`}
                    >
                      <div
                        className={`absolute top-1.5 right-2.5 text-[9px] font-black tracking-widest ${scoreMult > 3 ? "text-[#FFB454]/35" : "text-[#62F2C0]/20"}`}
                      >
                        X{scoreMult} REWARD
                      </div>
                      <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1.5 flex-wrap">
                        <span>🎯</span> Đúng chính xác tỉ số
                        {scoreMult > 3 && (
                          <span className="text-[8px] font-black text-[#FFB454] bg-[#FFB454]/15 border border-[#FFB454]/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Cửa dưới ×{scoreMult}
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-lg font-black tabular-nums mt-0.5 ${scoreMult > 3 ? "text-[#FFB454]" : "text-[#62F2C0]"}`}
                      >
                        +{fmt(wager * scoreMult)}{" "}
                        <span className="text-xs font-bold">💎</span>
                      </span>
                    </div>
                  ) : (
                    (() => {
                      const mult = betType === "1x2" ? wdlMult : 1;
                      const upset = betType === "1x2" && mult > 1;
                      return (
                        <div
                          className={`p-3 rounded-2xl relative overflow-hidden flex flex-col gap-1.5 bg-gradient-to-b ${
                            upset
                              ? "from-[#FFB454]/15 to-[#FFB454]/[0.02] border border-[#FFB454]/30"
                              : "from-[#62F2C0]/10 to-[#62F2C0]/[0.02] border border-[#62F2C0]/15"
                          }`}
                        >
                          <div
                            className={`absolute top-1.5 right-2.5 text-[9px] font-black tracking-widest ${upset ? "text-[#FFB454]/35" : "text-[#62F2C0]/20"}`}
                          >
                            X{mult} REWARD
                          </div>
                          <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1.5 flex-wrap">
                            <span>✅</span> Đoán đúng
                            {upset && (
                              <span className="text-[8px] font-black text-[#FFB454] bg-[#FFB454]/15 border border-[#FFB454]/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {selection === "DRAW" ? "Hòa" : "Cửa dưới"} ×
                                {mult}
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-lg font-black tabular-nums mt-0.5 ${upset ? "text-[#FFB454]" : "text-[#62F2C0]"}`}
                          >
                            +{fmt(wager * mult)}{" "}
                            <span className="text-xs font-bold">💎</span>
                          </span>
                        </div>
                      );
                    })()
                  )}

                  {/* Đoán sai */}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <span>❌</span> Đoán sai
                    </span>
                    <span className="font-bold text-[#ff5a5a] tabular-nums">
                      -{fmt(wager)} 💎
                    </span>
                  </div>
                </div>
              </>
            )}
            </div>

            {canEdit && (
              <div className="shrink-0 pt-3 mt-2 border-t border-white/5 space-y-2">
                {/* Action Buttons */}
                <div className="flex gap-2.5">
                  <button
                    onClick={onClose}
                    type="button"
                    className="btn-secondary px-6 py-3.5 rounded-xl text-xs font-bold shrink-0"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() =>
                      valid &&
                      onConfirm({
                        matchId: match.id,
                        betType,
                        selection: betType === "score" ? null : selection,
                        homeGoals: betType === "score" ? home : null,
                        awayGoals: betType === "score" ? away : null,
                        wager,
                        kickoff: match.utcDate,
                      })
                    }
                    disabled={!valid}
                    type="button"
                    className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2.5 ${
                      valid
                        ? "text-white btn-premium-glow active:scale-[0.98]"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                    }`}
                  >
                    <span className="tracking-wide">Đặt cược</span>
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${valid ? "bg-white/20" : "bg-white/5"}`}
                    >
                      💎 {fmt(wager)}
                    </span>
                  </button>
                </div>
                {chips < 10 && (
                  <div className="text-center text-xs text-[#ff5a5a] font-medium">
                    Không đủ chip để đặt cược (tối thiểu 10 💎)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Friends Bets */}
        {modalTab === "friends" && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-300">
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wide block border-b border-white/5 pb-2 mb-2">
                Danh sách dự đoán trong phòng ({roomBets?.length || 0} người)
              </span>
              {/* Còn đặt cược được → ẩn dự đoán + chip của người khác để tránh đoán theo. */}
              {canEdit && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-400/5 border border-amber-400/15 rounded-lg px-2.5 py-1.5">
                  <span>🔒</span>
                  <span>
                    Dự đoán của người khác được ẩn đến khi khóa cược (bóng lăn).
                  </span>
                </div>
              )}
              {roomBets && roomBets.length > 0 ? (
                <div className="space-y-3 divide-y divide-white/5">
                  {roomBets.map((b, idx) => (
                    <div
                      key={b.playerName}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-slate-400 ${
                        idx > 0 ? "pt-3" : ""
                      }`}
                    >
                      {/* Left: Player Name & Status Indicator */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.isMe ? "bg-[#62F2C0]" : "bg-[#334BFF]"}`}
                        />
                        <span className="font-semibold text-white truncate text-xs sm:text-sm">
                          {b.playerName}
                        </span>
                        {b.isMe && (
                          <span className="shrink-0 text-[8px] sm:text-[9px] bg-[#62F2C0]/10 text-[#62F2C0] border border-[#62F2C0]/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Bạn
                          </span>
                        )}
                      </div>

                      {/* Right: Score Predict & Wager badges.
                          Còn đặt cược được (canEdit) → chỉ chính mình (b.isMe) thấy giá trị thật;
                          dự đoán của người khác bị ẩn (giá trị thật KHÔNG render ra DOM). */}
                      {(() => {
                        const reveal = b.isMe || !canEdit;
                        return (
                          <div className="flex items-center gap-2 pl-3.5 sm:pl-0 self-start sm:self-auto flex-wrap">
                            {/* Score Predict Pill */}
                            <div className="flex items-center gap-1.5 bg-[#334BFF]/10 border border-[#334BFF]/20 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                              <span className="text-slate-400 text-[9px] sm:text-[10px]">
                                Dự đoán:
                              </span>
                              {reveal ? (
                                <strong className="text-white font-extrabold tabular-nums font-mono">
                                  {betLabel(b)}
                                </strong>
                              ) : (
                                <strong
                                  className="text-slate-500 font-extrabold font-mono blur-[3px] select-none"
                                  aria-label="đã ẩn"
                                >
                                  ?–?
                                </strong>
                              )}
                            </div>

                            {/* Wager Pill */}
                            <div className="flex items-center gap-1 bg-[#62F2C0]/10 border border-[#62F2C0]/20 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                              <span className="text-slate-400 text-[9px] sm:text-[10px]">
                                Cược:
                              </span>
                              <span className="font-bold text-[#62F2C0] tabular-nums font-mono flex items-center gap-0.5">
                                <span>💎</span>
                                {reveal ? (
                                  fmt(b.wager)
                                ) : (
                                  <span
                                    className="text-slate-500 blur-[3px] select-none"
                                    aria-label="đã ẩn"
                                  >
                                    ???
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic py-4 text-center">
                  Chưa có bạn bè nào trong phòng đặt cược.
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tab: Đội hình ra sân (tách riêng) */}
        {modalTab === "lineup" && (
          <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-300">
            {stats?.lineups ? (
              <LineupPitch lineups={stats.lineups} />
            ) : statsLoading ? (
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-6 text-center text-[11px] text-slate-500">
                Đang tải đội hình…
              </div>
            ) : (
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2 opacity-40">👥</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Đội hình ra sân
                </div>
                <div className="text-[11px] text-slate-500">
                  Đội chưa công bố đội hình xuất phát.{" "}
                  <span className="text-slate-400">
                    Thường có ~60 phút trước giờ bóng lăn.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Stats Details */}
        {modalTab === "stats" && (
          <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-300">
            {/* Tỉ số đã gộp vào header modal (xem khối Header) — không lặp lại ở đây.
                Đội hình ra sân đã tách sang tab "Đội hình" riêng. */}

            {/* Diễn biến chính (bàn thắng, thẻ) */}
            {stats?.events?.length > 0 && (
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Diễn biến chính
                </span>
                <div className="space-y-1.5">
                  {stats.events
                    .filter((e) => e.type === "Goal" || e.type === "Card")
                    .map((e, i) => {
                      const homeApi = stats.matchStats?.homeTeam;
                      const isHome = homeApi
                        ? e.team === homeApi
                        : e.team === homeName;
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
                            {e.assist && (
                              <span className="text-slate-500 font-normal">
                                {" "}
                                ({e.assist})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Thống kê trận đấu */}
            {stats?.matchStats && (
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Thống kê trận đấu
                </span>
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
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                            {label}
                          </span>
                          <span className="tabular-nums">{a ?? 0}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-700/40">
                          <div
                            className="bg-[#334BFF] h-full"
                            style={{ width: `${pct}%` }}
                          />
                          <div
                            className="bg-[#FFA07A] h-full"
                            style={{ width: `${100 - pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {liveNow && (
                  <div className="text-[9px] text-slate-500 text-center">
                    Tự cập nhật mỗi 30s khi trận đang diễn ra
                  </div>
                )}
              </div>
            )}

            {/* FIFA Rankings & Form (Beautiful Comparison Card) */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                So sánh phong độ & xếp hạng
              </span>

              {/* Team Headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5 justify-start min-w-0">
                  {renderModalFlag(homeName)}
                  <span className="font-bold text-white truncate text-xs">
                    {homeName}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-500 px-2 shrink-0">
                  VS
                </span>
                <div className="flex items-center gap-1.5 justify-end min-w-0">
                  <span className="font-bold text-white truncate text-xs text-right">
                    {awayName}
                  </span>
                  {renderModalFlag(awayName)}
                </div>
              </div>

              {/* Stats Comparison */}
              <div className="space-y-3 pt-1">
                {/* FIFA world ranking row (bảng tĩnh, cập nhật 6/2026) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-left text-sm">
                    {homeFifa != null ? `#${homeFifa}` : "—"}
                  </span>
                  <span
                    className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full min-w-[70px]"
                    title="Xếp hạng FIFA thế giới (6/2026)"
                  >
                    BXH FIFA
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-right text-sm">
                    {awayFifa != null ? `#${awayFifa}` : "—"}
                  </span>
                </div>

                {/* Group standing row (thật — hạng trong bảng World Cup) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="font-mono font-semibold text-slate-300 text-left text-[11px]">
                    {homeRankInfo
                      ? `Bảng ${homeRankInfo.group} · #${homeRankInfo.pos}`
                      : "—"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full min-w-[70px]">
                    Hạng bảng
                  </span>
                  <span className="font-mono font-semibold text-slate-300 text-right text-[11px]">
                    {awayRankInfo
                      ? `Bảng ${awayRankInfo.group} · #${awayRankInfo.pos}`
                      : "—"}
                  </span>
                </div>

                {/* Form Row (thật — phong độ gần đây) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <FormPips form={homeForm} align="start" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full min-w-[70px]">
                    {statsLoading ? "…" : "Phong độ"}
                  </span>
                  <FormPips form={awayForm} align="end" />
                </div>
              </div>
            </div>

            {/* Stadium, Referee, Weather (Modern 2x2 Grid with dedicated blocks) */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Thông tin sân & điều kiện
              </span>
              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                {/* Sân đấu */}
                <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-slate-400 flex items-center gap-1 font-medium text-[9px] uppercase tracking-wider">
                    <span>🏟</span> Sân đấu
                  </span>
                  <span
                    className="font-bold text-white truncate text-xs"
                    title={match.venue || stats?.venue || ""}
                  >
                    {match.venue ||
                      stats?.venue ||
                      (statsLoading ? "…" : "Đang cập nhật")}
                  </span>
                </div>
                {/* Thời tiết */}
                <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-slate-400 flex items-center gap-1 font-medium text-[9px] uppercase tracking-wider">
                    <span>☀️</span> Thời tiết
                  </span>
                  <span className="font-bold text-white truncate text-xs">
                    {stats?.weather?.tempC != null
                      ? `${stats.weather.tempC}°C${stats.weather.text ? ` (${stats.weather.text})` : ""}`
                      : statsLoading
                        ? "…"
                        : "Đang cập nhật"}
                  </span>
                </div>
                {/* Trọng tài */}
                <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-slate-400 flex items-center gap-1 font-medium text-[9px] uppercase tracking-wider">
                    <span>🏁</span> Trọng tài
                  </span>
                  <span
                    className="font-bold text-white truncate text-xs"
                    title={referee || ""}
                  >
                    {referee || "Đang cập nhật"}
                  </span>
                </div>
                {/* Thành phố */}
                <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-slate-400 flex items-center gap-1 font-medium text-[9px] uppercase tracking-wider">
                    <span>📍</span> Thành phố
                  </span>
                  <span
                    className="font-bold text-white truncate text-xs"
                    title={stats?.weather?.city || stats?.city || ""}
                  >
                    {stats?.weather?.city ||
                      stats?.city ||
                      (statsLoading ? "…" : "—")}
                  </span>
                </div>
              </div>
            </div>

            {/* Head to Head (H2H) (Visual layout with flags and aligned scores) */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Lịch sử đối đầu (H2H)
              </span>
              <div className="space-y-3">
                {statsLoading && !stats ? (
                  <div className="text-[10px] text-slate-500 text-center py-2">
                    Đang tải…
                  </div>
                ) : stats?.h2h?.length ? (
                  stats.h2h.map((g, i) => (
                    <div
                      key={i}
                      className={`flex flex-col gap-1 ${i < stats.h2h.length - 1 ? "pb-2.5 border-b border-white/5" : ""}`}
                    >
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        {[
                          g.league,
                          g.date ? new Date(g.date).getFullYear() : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="flex items-center gap-1.5 justify-end min-w-0">
                          <span className="font-semibold text-white truncate text-[11px]">
                            {g.home}
                          </span>
                          {renderModalFlag(g.home)}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/5 text-white font-mono font-black text-[11px] shrink-0 min-w-[38px] text-center">
                          {g.homeGoals ?? "-"} - {g.awayGoals ?? "-"}
                        </span>
                        <div className="flex items-center gap-1.5 justify-start min-w-0">
                          {renderModalFlag(g.away)}
                          <span className="font-semibold text-white truncate text-[11px]">
                            {g.away}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-500 text-center py-2">
                    {stats?.statsAvailable === false
                      ? "Chưa cấu hình nguồn dữ liệu đối đầu."
                      : "Không có dữ liệu đối đầu gần đây."}
                  </div>
                )}
              </div>
            </div>

            {/* Tỉ lệ lựa chọn cộng đồng — tính thật từ kèo trong phòng */}
            {communityDist && (
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Tỉ lệ lựa chọn cộng đồng
                  <span className="text-slate-500 font-medium ml-1">
                    ({communityDist.total} kèo)
                  </span>
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-white gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {renderModalFlag(homeName)}
                      <span className="truncate text-[10px]">
                        {homeName} ({communityDist.home}%)
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] shrink-0">
                      Hòa ({communityDist.draw}%)
                    </span>
                    <div className="flex items-center gap-1 justify-end min-w-0">
                      <span className="truncate text-right text-[10px]">
                        {awayName} ({communityDist.away}%)
                      </span>
                      {renderModalFlag(awayName)}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                    <div
                      className="bg-[#334BFF] h-full"
                      style={{ width: `${communityDist.home}%` }}
                    />
                    <div
                      className="bg-slate-500 h-full"
                      style={{ width: `${communityDist.draw}%` }}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${communityDist.away}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold"
            >
              Đóng chi tiết
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
