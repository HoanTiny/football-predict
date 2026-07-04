"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { flagOf, flagImgOf, matchIsLive, liveStatusVN, betLabel } from "@/lib/constants";
import { vnDateKey, vnDateHeader, vnNowKey, vnTime } from "@/lib/time";
import { getTeamGroup } from "@/lib/standings";
import { getFifaRank } from "@/lib/fifaRankings";
import MatchCard from "../MatchCard";
import SkeletonCard from "../SkeletonCard";

const SCHEDULE_FILTERS = [
  { key: "YESTERDAY", label: "Hôm qua" },
  { key: "TODAY", label: "Hôm nay" },
  { key: "UPCOMING", label: "Sắp tới" },
  { key: "ALL", label: "Tất cả" },
];

/** TAB 1 — Lịch thi đấu — Stacked rows with left status column */
export default function ScheduleTab({
  matches,
  loading,
  error,
  onRetry,
  predictionByMatch,
  onBet,
  betsByMatch,
  leagueName = "World Cup 2026",
}) {
  const [filter, setFilter] = useState("TODAY");

  const nextMatch = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const now = new Date();
    const upcoming = matches.filter((m) => {
      const isScheduled = m.status === "SCHEDULED" || m.status === "TIMED";
      return isScheduled && new Date(m.utcDate) > now;
    });
    if (upcoming.length === 0) {
      const unfinished = matches.filter((m) => m.status !== "FINISHED");
      return unfinished[0] || matches[0];
    }
    return [...upcoming].sort(
      (a, b) => new Date(a.utcDate) - new Date(b.utcDate),
    )[0];
  }, [matches]);

  // TẤT CẢ trận đang diễn ra (có thể nhiều) — hero dạng slide chuyển qua từng trận.
  const liveMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    return matches
      .filter((m) => matchIsLive(m))
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }, [matches]);

  // Vị trí slide hiện tại; kẹp lại khi số trận live thay đổi.
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    setHeroIdx((i) => (i > liveMatches.length - 1 ? 0 : i));
  }, [liveMatches.length]);

  const isHeroLive = liveMatches.length > 0;
  const heroMatch = isHeroLive ? liveMatches[heroIdx] : nextMatch;

  // Poll trạng thái chi tiết của trận hero khi đang diễn ra
  const [liveDetail, setLiveDetail] = useState({ minute: null, events: [], score: null });
  const detailHome = heroMatch?.homeTeam?.name;
  const detailAway = heroMatch?.awayTeam?.name;
  const detailVenue = heroMatch?.venue;
  const detailDate = heroMatch?.utcDate;

  useEffect(() => {
    if (!isHeroLive || !heroMatch) {
      setLiveDetail({ minute: null, events: [], score: null });
      return;
    }
    let active = true;
    const load = () => {
      const qs = new URLSearchParams({
        home: detailHome || "",
        away: detailAway || "",
        venue: detailVenue || "",
        date: detailDate || "",
      });
      fetch(`/api/match-stats?${qs}`)
        .then((r) => r.json())
        .then((d) => active && setLiveDetail({ minute: d.liveMinute || null, events: d.events || [], score: d.liveScore || null }))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isHeroLive, detailHome, detailAway, detailVenue, detailDate]);

  // Người ghi bàn của hero, tách theo đội (để xếp bên trái/phải như Google Sports).
  const heroGoals = (liveDetail.events || []).filter((e) => e.type === "Goal");

  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false,
  });

  useEffect(() => {
    if (!nextMatch) return;
    const targetTime = new Date(nextMatch.utcDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isOver: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const formatNum = (num) => String(num).padStart(2, "0");

  const heroMatchGroup = heroMatch
    ? getTeamGroup(heroMatch.homeTeam?.name)
    : null;
  const heroMatchPrediction = heroMatch
    ? predictionByMatch?.get(heroMatch.id)
    : null;
  // Ưu tiên tỉ số LIVE từ FotMob.
  const heroHomeScore = liveDetail.score?.home ?? heroMatch?.score?.fullTime?.home ?? 0;
  const heroAwayScore = liveDetail.score?.away ?? heroMatch?.score?.fullTime?.away ?? 0;

  const matchesByDate = useMemo(() => {
    let list = matches || [];
    if (filter === "YESTERDAY") {
      const yesterday = vnDateKey(new Date(Date.now() - 24 * 3600 * 1000));
      list = list.filter((m) => vnDateKey(m.utcDate) === yesterday);
    } else if (filter === "TODAY") {
      const today = vnNowKey();
      list = list.filter((m) => vnDateKey(m.utcDate) === today);
    } else if (filter === "UPCOMING") {
      list = list.filter((m) => m.status !== "FINISHED");
    }
    // "ALL" filters nothing

    const sorted = [...list].sort(
      (a, b) => new Date(a.utcDate) - new Date(b.utcDate),
    );

    const groups = [];
    let lastKey = null;
    sorted.forEach((m) => {
      const key = vnDateKey(m.utcDate);
      if (key !== lastKey) {
        groups.push({ key, header: vnDateHeader(m.utcDate), items: [] });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(m);
    });
    return groups;
  }, [matches, filter]);

  // Điều hướng slide giữa các trận đang trực tiếp (vòng tròn) + vuốt trên mobile.
  const multiLive = liveMatches.length > 1;
  const goLive = (delta) =>
    setHeroIdx((i) => {
      const n = liveMatches.length;
      return n ? (i + delta + n) % n : 0;
    });
  const touchStartX = useRef(null);
  const onHeroTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onHeroTouchEnd = (e) => {
    if (touchStartX.current == null || !multiLive) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) goLive(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const selectedDateObject = useMemo(() => {
    const d = new Date();
    if (filter === "YESTERDAY") d.setDate(d.getDate() - 1);
    return d;
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Section title — displaying the league participating in the prediction */}
      <div className="text-center select-none space-y-0.5">
        <div className="text-[9px] font-bold tracking-[0.25em] uppercase text-white/50">
          GIẢI ĐẤU DỰ ĐOÁN
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
          {leagueName}
        </h2>
      </div>

      {/* 4 tab kính mờ kiểu calendar: Hôm qua / Hôm nay / Sắp tới / Tất cả (Đẩy lên đầu) */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center justify-center select-none w-full">
          <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shrink-0">
            {SCHEDULE_FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        {(filter === "YESTERDAY" || filter === "TODAY") && (
          <div className="text-center text-[10px] text-white/40 font-medium select-none">
            {String(selectedDateObject.getDate()).padStart(2, "0")}/
            {String(selectedDateObject.getMonth() + 1).padStart(2, "0")}/
            {selectedDateObject.getFullYear()}
          </div>
        )}
      </div>

      {/* Hero — trận đang diễn ra (live) hoặc đếm ngược trận kế tiếp */}
      {heroMatch ? (
        <div
          className={`relative overflow-hidden rounded-[28px] p-6 bg-white/10 border backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.25)] flex flex-col transition-all duration-200 ${
            isHeroLive && onBet
              ? "border-[#ff5a5a]/40 cursor-pointer hover:border-[#ff5a5a]/70"
              : "border-white/15"
          }`}
          style={{ minHeight: 200 }}
          onTouchStart={onHeroTouchStart}
          onTouchEnd={onHeroTouchEnd}
          {...(isHeroLive && onBet
            ? {
                role: "button",
                tabIndex: 0,
                onClick: () => onBet(heroMatch, "stats"),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBet(heroMatch, "stats");
                  }
                },
              }
            : {})}
        >
          {/* Background Lights Glow */}
          <div className="absolute inset-0 bg-radial-gradient from-[#334BFF]/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#334BFF]/5 rounded-bl-full pointer-events-none blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFA07A]/5 rounded-tr-full pointer-events-none blur-2xl" />

          {/* Điều hướng slide khi có nhiều trận trực tiếp — pill gọn góc trên-trái */}
          {multiLive && (
            <div
              className="absolute top-3 left-3 z-30 flex items-center gap-1 px-1 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Trận trước"
                onClick={() => goLive(-1)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-[10px] font-black tabular-nums text-white px-0.5">
                {heroIdx + 1}<span className="text-white/50">/{liveMatches.length}</span>
              </span>
              <button
                type="button"
                aria-label="Trận sau"
                onClick={() => goLive(1)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {/* Symmetrical Layout Header (Names at the edges) */}
          <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-4 select-none w-full relative z-10">
            <span className="truncate pr-4">{heroMatch.homeTeam?.name || "—"}</span>
            <span className="truncate pl-4 text-right">{heroMatch.awayTeam?.name || "—"}</span>
          </div>

          {/* Symmetrical Flags & Center Score */}
          <div className="relative z-10 w-full flex items-center justify-between gap-4">
            {/* Left Flag */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/15 bg-white/5 shadow-md shrink-0">
                {flagImgOf(heroMatch.homeTeam?.name) ? (
                  <img
                    src={flagImgOf(heroMatch.homeTeam?.name)}
                    alt={heroMatch.homeTeam?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl leading-none">
                    {flagOf(heroMatch.homeTeam?.name)}
                  </span>
                )}
              </div>
            </div>

            {/* Center Score / Countdown / Status */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                {heroMatch.stage === "GROUP_STAGE" && heroMatchGroup
                  ? `Bảng ${heroMatchGroup}`
                  : heroMatch.stage || "—"}
              </span>

              {isHeroLive ? (
                <div className="flex items-center gap-2 text-4xl font-black text-white tabular-nums">
                  <span>{heroHomeScore}</span>
                  <span className="w-2 h-2 rounded-full bg-[#ff5a5a] animate-pulse shrink-0" />
                  <span>{heroAwayScore}</span>
                </div>
              ) : (
                /* Countdown or scheduled kickoff */
                <div className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-1">
                  {timeLeft.isOver ? (
                    <span>Sắp đấu</span>
                  ) : (
                    <span className="font-mono tabular-nums">
                      {formatNum(timeLeft.hours)}:{formatNum(timeLeft.minutes)}:{formatNum(timeLeft.seconds)}
                    </span>
                  )}
                </div>
              )}

              <span className="text-[10px] font-extrabold text-[#ff8a8a] uppercase tracking-widest mt-0.5">
                {isHeroLive
                  ? liveStatusVN(heroMatch.minute != null ? String(heroMatch.minute) : liveDetail.minute)
                  : `${vnTime(heroMatch.utcDate)} · ${vnDateHeader(heroMatch.utcDate)}`}
              </span>
            </div>

            {/* Right Flag */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/15 bg-white/5 shadow-md shrink-0">
                {flagImgOf(heroMatch.awayTeam?.name) ? (
                  <img
                    src={flagImgOf(heroMatch.awayTeam?.name)}
                    alt={heroMatch.awayTeam?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl leading-none">
                    {flagOf(heroMatch.awayTeam?.name)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action / Prediction footer area inside card */}
          <div className="mt-5 pt-4 border-t border-white/5 w-full flex flex-col items-center relative z-10" onClick={(e) => e.stopPropagation()}>
            {isHeroLive ? (
              <div className="flex flex-col items-center gap-2.5">
                {heroMatchPrediction && heroMatchPrediction.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {heroMatchPrediction.map((p, pIdx) => (
                      <span
                        key={pIdx}
                        className="btn-secondary px-3.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 shrink-0 opacity-90"
                      >
                        <span>Dự đoán:</span>
                        <strong className="text-white font-extrabold bg-[#334BFF]/10 border border-[#334BFF]/35 px-1.5 py-0.5 rounded text-[9px] tabular-nums">
                          {p.homeGoals}–{p.awayGoals}
                        </strong>
                        <span className="text-[9px] text-slate-400">
                          💎{p.wager}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    🔒 Đã khoá cược — trận đang diễn ra
                  </span>
                )}
                {onBet && (
                  <button
                    onClick={() => onBet(heroMatch, "stats")}
                    className="btn-primary px-4 py-1.5 text-[10px] font-bold flex items-center gap-1 shadow-[0_4px_12px_rgba(255,90,90,0.2)] cursor-pointer"
                  >
                    📊 Xem thông số trực tiếp
                  </button>
                )}
              </div>
            ) : (
              onBet && (heroMatchPrediction && heroMatchPrediction.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center items-center">
                  {heroMatchPrediction.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => onBet(heroMatch)}
                      className="btn-secondary px-3.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 hover:border-[#334BFF]/50 shrink-0 cursor-pointer"
                    >
                      <span>Dự đoán:</span>
                      <strong className="text-white font-extrabold bg-[#334BFF]/10 border border-[#334BFF]/35 px-1.5 py-0.5 rounded text-[9px] tabular-nums">
                        {betLabel(p)}
                      </strong>
                      <span className="text-[9px] text-slate-455">
                        💎{p.wager}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => onBet(heroMatch)}
                    className="btn-primary px-3.5 py-1.5 text-[10px] font-bold flex items-center gap-1 shadow-[0_4px_12px_rgba(51,75,255,0.2)] shrink-0 cursor-pointer"
                  >
                    <span>+ Đặt thêm</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onBet(heroMatch)}
                  className="btn-primary px-5 py-2 text-[10px] font-bold uppercase tracking-wider shadow-[0_4px_12px_rgba(51,75,255,0.2)] animate-bounce cursor-pointer"
                >
                  Dự đoán ngay
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Original Text Hero fallback if no upcoming matches exist */
        <div
          className="relative overflow-hidden rounded-[24px] bg-white/[0.08] border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_32px_rgba(0,0,0,0.22)] p-6 flex flex-col justify-center"
          style={{ minHeight: 200 }}
        >
          {/* Subtle geometric shapes */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#334BFF]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFA07A]/5 to-transparent rounded-tr-full pointer-events-none" />

          <div className="relative z-10 space-y-2.5 max-w-xl">
            <span className="text-[10px] font-bold text-[#334BFF] uppercase tracking-[0.2em]">
              TINY SPORTS 2026™
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              Dự đoán. Tranh tài. Bứt phá.
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Tham gia dự đoán tỉ số các trận đấu chính thức của World Cup 2026.
              Tích lũy điểm số, khẳng định vị thế và leo bảng xếp hạng cùng bạn
              bè.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-5 text-center bg-red-950/20 border border-red-900/40">
          <div className="font-bold mb-1 text-[#ff5a5a] text-sm">
            Không thể tải dữ liệu — kiểm tra API token.
          </div>
          <div className="text-[11px] text-white/50 mb-3">({error})</div>
          <button
            onClick={onRetry}
            className="btn-primary px-4 py-2 text-xs font-bold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && matchesByDate.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-xs text-white/50 font-medium">
            Không có trận đấu nào trong mục này.
          </p>
        </div>
      )}

      {/* Matches grouped by date */}
      {!loading &&
        matchesByDate.map((g) => (
          <div key={g.key} className="space-y-3">
            {/* Date header */}
            <div className="flex items-center gap-2.5 pt-3 pb-1">
              <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-widest shrink-0">
                {g.header}
              </h3>
              <span className="h-px flex-grow bg-white/5 rounded-full" />
            </div>

            {/* Match rows list */}
            <div className="space-y-2.5">
              {g.items.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={predictionByMatch?.get(m.id)}
                  onBet={onBet}
                  roomBets={betsByMatch?.get(m.id)}
                />
              ))}
            </div>
          </div>
        ))}

    </div>
  );
}
