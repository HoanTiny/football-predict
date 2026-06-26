"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { FILTERS, GROUPS, flagOf, flagImgOf, matchIsLive, liveStatusVN, betLabel } from "@/lib/constants";
import { vnDateKey, vnDateHeader, vnNowKey, vnTomorrowKey, vnTime } from "@/lib/time";
import { calculateGroupStandings, getTeamGroup } from "@/lib/standings";
import { getFifaRank } from "@/lib/fifaRankings";
import MatchCard from "../MatchCard";
import SkeletonCard from "../SkeletonCard";
import Icon from "../Icon";

const renderStandingsFlag = (team) => {
  const imgUrl = flagImgOf(team.name);
  if (imgUrl) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={team.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[13px] leading-none">
      {team.flag}
    </div>
  );
};

/** TAB 1 — Lịch thi đấu — Symmetrical matchup rows, compact layout */
export default function ScheduleTab({
  matches,
  loading,
  error,
  onRetry,
  predictionByMatch,
  onBet,
  betsByMatch,
}) {
  const [filter, setFilter] = useState("ALL");
  const [selectedGroup, setSelectedGroup] = useState("A");

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
  // Hero ưu tiên trận live (theo slide); nếu không có thì đếm ngược trận kế tiếp.
  const heroMatch = isHeroLive
    ? liveMatches[Math.min(heroIdx, liveMatches.length - 1)]
    : nextMatch;

  // Dữ liệu trực tiếp cho hero (phút + người ghi bàn + tỉ số) — của ĐÚNG trận đang slide.
  // Lấy từ /api/match-stats (FotMob bù khi feed không có). Poll 30s.
  const [liveDetail, setLiveDetail] = useState({ minute: null, events: [], score: null });
  const detailHome = isHeroLive ? heroMatch?.homeTeam?.name : null;
  const detailAway = isHeroLive ? heroMatch?.awayTeam?.name : null;
  const detailVenue = isHeroLive ? heroMatch?.venue : null;
  const detailDate = isHeroLive ? heroMatch?.utcDate : null;
  useEffect(() => {
    if (!detailHome) {
      setLiveDetail({ minute: null, events: [], score: null });
      return;
    }
    let active = true;
    setLiveDetail({ minute: null, events: [], score: null }); // xoá dữ liệu trận cũ khi đổi slide
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
  }, [detailHome, detailAway, detailVenue, detailDate]);

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
  // Ưu tiên tỉ số LIVE từ FotMob (football-data thường trễ 1-2 phút khi đang đá).
  const heroHomeScore = liveDetail.score?.home ?? heroMatch?.score?.fullTime?.home ?? 0;
  const heroAwayScore = liveDetail.score?.away ?? heroMatch?.score?.fullTime?.away ?? 0;

  const matchesByDate = useMemo(() => {
    let list = matches;
    if (filter === "TODAY") {
      const today = vnNowKey();
      list = list.filter((m) => vnDateKey(m.utcDate) === today);
    } else if (filter === "TOMORROW") {
      const tomorrow = vnTomorrowKey();
      list = list.filter((m) => vnDateKey(m.utcDate) === tomorrow);
    } else if (filter === "UPCOMING") {
      // Trận chưa kết thúc (đang đá + sắp đá) — gom lên đầu, khỏi kéo qua trận đã xong.
      list = list.filter((m) => m.status !== "FINISHED");
    } else if (filter !== "ALL") {
      list = list.filter((m) => m.stage === filter);
      if (filter === "GROUP_STAGE") {
        list = list.filter((m) => {
          const group = getTeamGroup(m.homeTeam?.name);
          return group === selectedGroup;
        });
      }
    }
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
  }, [matches, filter, selectedGroup]);

  const groupStandings = useMemo(() => {
    if (filter !== "GROUP_STAGE") return [];
    // Chỉ tính kết quả thật (đã đá + đang đá realtime), không cộng dự đoán.
    return calculateGroupStandings(
      matches,
      selectedGroup,
      predictionByMatch,
      false,
    );
  }, [matches, selectedGroup, predictionByMatch, filter]);

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

  return (
    <div className="space-y-6">
      {/* Hero — trận đang diễn ra (live) hoặc đếm ngược trận kế tiếp */}
      {heroMatch ? (
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#08142D] via-[#0B1735] to-[#10204A] border p-6 flex flex-col items-center justify-center text-center shadow-2xl ${
            isHeroLive && onBet
              ? "border-[#ff5a5a]/30 cursor-pointer transition-colors hover:border-[#ff5a5a]/60"
              : "border-white/5"
          }`}
          style={{ minHeight: 280 }}
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
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-[10px] font-black tabular-nums text-white px-0.5">
                {heroIdx + 1}<span className="text-slate-500">/{liveMatches.length}</span>
              </span>
              <button
                type="button"
                aria-label="Trận sau"
                onClick={() => goLive(1)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {/* Hint: nhấn để xem chi tiết */}
          {onBet && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.04] border border-white/[0.06] group-hover:text-white group-hover:border-white/20 transition-all">
              <Icon name="chart" className="w-3 h-3" />
              <span className="hidden sm:inline">Chi tiết</span>
            </div>
          )}

          {/* Symmetrical Layout Grid */}
          <div className="relative z-10 w-full flex items-center justify-between gap-6 max-w-3xl">
            {/* Left Home Team (Desktop only) */}
            <div className="hidden md:flex flex-col items-center justify-center gap-2 w-28 shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/10 bg-slate-900/40 shadow-lg p-0.5">
                {flagImgOf(heroMatch.homeTeam?.name) ? (
                  <img
                    src={flagImgOf(heroMatch.homeTeam?.name)}
                    alt={heroMatch.homeTeam?.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-3xl leading-none">
                    {flagOf(heroMatch.homeTeam?.name)}
                  </span>
                )}
              </div>
              <span className="font-bold text-xs text-white truncate max-w-full">
                {heroMatch.homeTeam?.name}
              </span>
              {getFifaRank(heroMatch.homeTeam?.name) != null && (
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  FIFA #{getFifaRank(heroMatch.homeTeam?.name)}
                </span>
              )}
            </div>

            {/* Center Countdown & Match Metadata */}
            <div className="flex-1 flex flex-col items-center space-y-4">
              <div className="flex flex-col items-center space-y-1">
                {isHeroLive ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#ff5a5a] uppercase tracking-[0.25em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
                      Đang Diễn Ra
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      {liveStatusVN(heroMatch.minute != null ? String(heroMatch.minute) : liveDetail.minute)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-extrabold text-[#7b8fff] uppercase tracking-[0.25em]">
                      Trận Đấu Tiếp Theo
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      NEXT KICKOFF
                    </span>
                  </>
                )}
              </div>

              {/* Live score OR countdown row */}
              <div className="flex items-center justify-center gap-4 py-1.5 w-full">
                {isHeroLive ? (
                  /* Live score — cập nhật trực tiếp mỗi lần poll dữ liệu */
                  <div className="flex items-center gap-3 font-mono">
                    <div className="w-14 h-16 bg-white/5 border border-[#ff5a5a]/30 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-inner backdrop-blur-md tabular-nums">
                      {heroHomeScore}
                    </div>
                    <span className="text-2xl font-black text-slate-500">–</span>
                    <div className="w-14 h-16 bg-white/5 border border-[#ff5a5a]/30 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-inner backdrop-blur-md tabular-nums">
                      {heroAwayScore}
                    </div>
                  </div>
                ) : (
                  /* Timer blocks */
                  <div className="flex items-center gap-2 font-mono">
                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-inner backdrop-blur-md">
                        {formatNum(timeLeft.hours)}
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        GIỜ
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-600 self-start mt-3">
                      :
                    </span>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-inner backdrop-blur-md">
                        {formatNum(timeLeft.minutes)}
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        PHÚT
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-600 self-start mt-3">
                      :
                    </span>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl font-bold text-[#FFA07A] shadow-inner backdrop-blur-md">
                        {formatNum(timeLeft.seconds)}
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        GIÂY
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Người ghi bàn — kiểu Google Sports: chủ nhà bên trái, khách bên phải */}
              {isHeroLive && heroGoals.length > 0 && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 w-full max-w-md text-[11px]">
                  <div className="flex flex-col gap-0.5 items-end text-right min-w-0">
                    {heroGoals
                      .filter((g) => g.team === heroMatch.homeTeam?.name)
                      .map((g, i) => (
                        <span key={i} className="text-slate-300 font-semibold truncate max-w-full">
                          {g.player} <span className="text-slate-500 tabular-nums">{g.minute}'</span>
                        </span>
                      ))}
                  </div>
                  <span className="text-slate-500 shrink-0 pt-0.5">⚽</span>
                  <div className="flex flex-col gap-0.5 items-start text-left min-w-0">
                    {heroGoals
                      .filter((g) => g.team !== heroMatch.homeTeam?.name)
                      .map((g, i) => (
                        <span key={i} className="text-slate-300 font-semibold truncate max-w-full">
                          <span className="text-slate-500 tabular-nums">{g.minute}'</span> {g.player}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Match Details */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-[#62F2C0] uppercase tracking-widest">
                  {heroMatch.stage === "GROUP_STAGE" && heroMatchGroup
                    ? `BẢNG ${heroMatchGroup}`
                    : heroMatch.stage}
                </div>
                <div className="text-xs font-bold text-slate-300 md:hidden px-3">
                  {heroMatch.homeTeam?.name} vs {heroMatch.awayTeam?.name}
                </div>
                <div className="text-[10px] font-semibold text-slate-400">
                  {vnDateHeader(heroMatch.utcDate)} ·{" "}
                  {vnTime(heroMatch.utcDate)} — {heroMatch.venue || "BMO Field"}
                </div>
              </div>

              {/* Action Button — khi live thì khoá cược, chỉ xem lại dự đoán */}
              <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                {isHeroLive ? (
                  <div className="flex flex-col items-center gap-2">
                    {heroMatchPrediction && heroMatchPrediction.length > 0 ? (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {heroMatchPrediction.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-2 shrink-0 opacity-90"
                          >
                            <span>Dự đoán:</span>
                            <strong className="text-white font-extrabold bg-[#334BFF]/10 border border-[#334BFF]/35 px-2 py-0.5 rounded text-[10px] tabular-nums">
                              {p.homeGoals}–{p.awayGoals}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              💎{p.wager}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        🔒 Đã khoá cược — trận đang diễn ra
                      </span>
                    )}
                    {onBet && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBet(heroMatch, "stats");
                        }}
                        className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(255,90,90,0.25)]"
                      >
                        📊 Xem thông số trực tiếp
                      </button>
                    )}
                  </div>
                ) : (
                  onBet && (heroMatchPrediction && heroMatchPrediction.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {heroMatchPrediction.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => onBet(heroMatch)}
                          className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-2 hover:border-[#334BFF]/50 shrink-0"
                        >
                          <span>Dự đoán:</span>
                          <strong className="text-white font-extrabold bg-[#334BFF]/10 border border-[#334BFF]/35 px-2 py-0.5 rounded text-[10px] tabular-nums">
                            {betLabel(p)}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            💎{p.wager}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => onBet(heroMatch)}
                        className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(51,75,255,0.2)] shrink-0"
                      >
                        <span>+ Đặt thêm</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onBet(heroMatch)}
                      className="btn-primary px-6 py-2 text-xs font-bold uppercase tracking-wider shadow-[0_4px_12px_rgba(51,75,255,0.2)] animate-bounce"
                    >
                      Dự đoán ngay
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Away Team (Desktop only) */}
            <div className="hidden md:flex flex-col items-center justify-center gap-2 w-28 shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/10 bg-slate-900/40 shadow-lg p-0.5">
                {flagImgOf(heroMatch.awayTeam?.name) ? (
                  <img
                    src={flagImgOf(heroMatch.awayTeam?.name)}
                    alt={heroMatch.awayTeam?.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-3xl leading-none">
                    {flagOf(heroMatch.awayTeam?.name)}
                  </span>
                )}
              </div>
              <span className="font-bold text-xs text-white truncate max-w-full">
                {heroMatch.awayTeam?.name}
              </span>
              {getFifaRank(heroMatch.awayTeam?.name) != null && (
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  FIFA #{getFifaRank(heroMatch.awayTeam?.name)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Original Text Hero fallback if no upcoming matches exist */
        <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1735] to-[#10204A] border border-white/5 p-6 flex flex-col justify-center"
          style={{ minHeight: 200 }}
        >
          {/* Subtle geometric shapes */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#334BFF]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFA07A]/5 to-transparent rounded-tr-full pointer-events-none" />

          <div className="relative z-10 space-y-2.5 max-w-xl">
            <span className="text-[10px] font-bold text-[#334BFF] uppercase tracking-[0.2em]">
              TINY FOOTBALL 2026™
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              Dự đoán. Tranh tài. Bứt phá.
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Tham gia dự đoán tỉ số các trận đấu chính thức của World Cup 2026.
              Tích lũy điểm số, khẳng định vị thế và leo bảng xếp hạng cùng bạn
              bè.
            </p>
          </div>
        </div>
      )}

      {/* Match filters header anchor */}
      <div id="match-list-start" className="space-y-3">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  active
                    ? "bg-[#334BFF] text-white border border-[#334BFF]"
                    : "bg-slate-800/40 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Group navigation pills if GROUP_STAGE is selected */}
        {filter === "GROUP_STAGE" && (
          <div className="flex gap-2 overflow-x-auto pb-2.5 -mx-4 px-4 scrollbar-thin">
            {Object.keys(GROUPS).map((groupLetter) => {
              const isActive = selectedGroup === groupLetter;
              return (
                <button
                  key={groupLetter}
                  onClick={() => setSelectedGroup(groupLetter)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? "bg-[#334BFF] text-white border border-[#334BFF]"
                      : "bg-slate-800/40 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  BẢNG {groupLetter}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Standings Table for the selected group if GROUP_STAGE is selected */}
      {filter === "GROUP_STAGE" && !loading && !error && (
        <div className="bg-[#0B1735] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-slate-900/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Bảng Xếp Hạng</span>
              <span className="text-[#334BFF] font-black">
                BẢNG {selectedGroup}
              </span>
            </h4>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Top 2 đội đi tiếp
            </span>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left text-slate-300 min-w-[560px] table-fixed border-collapse">
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-14" />
                <col className="w-11" />
                <col className="w-11" />
                <col className="w-11" />
                <col className="w-11" />
                <col className="w-11" />
                <col className="w-11" />
                <col className="w-14" />
              </colgroup>
              <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-slate-900/25">
                <tr>
                  <th className="py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-2 text-left">Đội</th>
                  <th
                    className="py-2.5 px-1 text-center text-white font-extrabold"
                    title="Điểm"
                  >
                    Điểm
                  </th>
                  <th
                    className="py-2.5 px-1 text-center"
                    title="Số trận đã đấu"
                  >
                    Trận
                  </th>
                  <th
                    className="py-2.5 px-1 text-center text-[#62F2C0]"
                    title="Thắng"
                  >
                    T
                  </th>
                  <th
                    className="py-2.5 px-1 text-center text-[#FFA07A]"
                    title="Hòa"
                  >
                    H
                  </th>
                  <th
                    className="py-2.5 px-1 text-center text-[#ff5a5a]"
                    title="Thua"
                  >
                    B
                  </th>
                  <th className="py-2.5 px-1 text-center" title="Bàn thắng">
                    BT
                  </th>
                  <th className="py-2.5 px-1 text-center" title="Bàn thua">
                    BB
                  </th>
                  <th
                    className="py-2.5 px-2 text-center"
                    title="Hiệu số bàn thắng"
                  >
                    HS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groupStandings.map((team, idx) => {
                  const pos = idx + 1;
                  const isQualified = pos <= 2;
                  return (
                    <tr
                      key={team.name}
                      className={`standings-row h-11 ${
                        isQualified ? "standings-row-qualified" : ""
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-400">
                        <span
                          className={
                            isQualified ? "text-[#62F2C0] font-black" : ""
                          }
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-bold text-white">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {renderStandingsFlag(team)}
                          <span className="truncate">{team.name}</span>
                          {team.live && (
                            <span
                              className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#E40000]/15 text-[#ff5a5a]"
                              title="Trận đang diễn ra — tỉ số cập nhật trực tiếp"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
                              Đang đá
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-center font-extrabold text-white text-sm tabular-nums">
                        {team.pts}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400 font-medium tabular-nums">
                        {team.pj}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300 font-medium tabular-nums">
                        {team.pg}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300 font-medium tabular-nums">
                        {team.pe}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300 font-medium tabular-nums">
                        {team.pp}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400 font-medium tabular-nums">
                        {team.gf}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400 font-medium tabular-nums">
                        {team.gc}
                      </td>
                      <td
                        className={`py-2 px-2 text-center font-bold text-xs tabular-nums ${
                          team.dg > 0
                            ? "text-[#62F2C0]"
                            : team.dg < 0
                              ? "text-[#ff5a5a]"
                              : "text-slate-400"
                        }`}
                      >
                        {team.dg > 0 ? `+${team.dg}` : team.dg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-5 text-center bg-red-950/20 border border-red-900/40">
          <div className="font-bold mb-1 text-[#ff5a5a] text-sm">
            Không thể tải dữ liệu — kiểm tra API token.
          </div>
          <div className="text-[11px] text-slate-500 mb-3">({error})</div>
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
          <p className="text-xs text-slate-500 font-medium">
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
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
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
