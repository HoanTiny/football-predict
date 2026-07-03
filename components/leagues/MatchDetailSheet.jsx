"use client";

import { useEffect, useRef, useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnShortDateTime } from "@/lib/time";
import { flagImgOf } from "@/lib/constants";
import { useFavTeams } from "@/hooks/useFavTeams";
import AuthModal from "../AuthModal";
import LineupPitch from "../LineupPitch";

/** Nút ★ theo dõi/bỏ theo dõi đội — hiện cạnh tên đội trong bảng tỉ số. Yêu cầu đăng nhập
 * (đồng bộ theo tài khoản, chung với game Dự đoán) — chưa đăng nhập thì mở modal đăng nhập. */
function FollowStar({ team, leagueId }) {
  const { isFav, toggle, needsAuth } = useFavTeams();
  const [authOpen, setAuthOpen] = useState(false);
  if (!team?.id || !leagueId) return null;
  const fav = isFav(team.id);
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (needsAuth) setAuthOpen(true);
          else toggle({ id: team.id, name: team.name, leagueId });
        }}
        title={fav ? "Bỏ theo dõi đội" : "Theo dõi đội"}
        className={`text-sm leading-none transition-colors ${fav ? "text-amber-400" : "text-white/30 hover:text-white/60"}`}
      >
        {fav ? "★" : "☆"}
      </button>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

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
  const H = num(h),
    A = num(a);
  return H + A ? Math.round((H / (H + A)) * 100) : 50;
};

const FormPips = ({ form, align = "start" }) => (
  <div
    className={`flex gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}
  >
    {form.length === 0 ? (
      <span className="text-[10px] text-slate-500">—</span>
    ) : (
      form.map((c, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white ${
            c === "W"
              ? "bg-emerald-500"
              : c === "L"
                ? "bg-rose-500"
                : "bg-slate-500"
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
  const fallbackUrl = !url || err ? flagImgOf(name) : null;

  if (fallbackUrl) {
    return (
      <img
        src={fallbackUrl}
        alt={name}
        className={`${cls} object-cover rounded-full shrink-0 border border-white/10`}
      />
    );
  }

  if (!url || err) {
    return (
      <div
        className={`${cls} rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0`}
      >
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setErr(true)}
      className={`${cls} object-contain shrink-0`}
    />
  );
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

export default function MatchDetailSheet({ match, leagueId, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("lineup");
  const isLive = match.started && !match.finished && !match.cancelled;

  // Bottom-sheet kiểu Apple Sports trên mobile: mở ra ở dạng "peek" (thẻ lửng, thấy nền phía
  // sau), vuốt lên để full màn hình (header thu gọn lại 1 hàng). Trên sm+ vẫn là modal giữa màn
  // hình như cũ, không bị ảnh hưởng bởi trạng thái này.
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef({ startY: 0, dragging: false });

  const dragStart = (y) => {
    dragRef.current = { startY: y, dragging: true };
  };
  const dragEnd = (y) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const delta = y - dragRef.current.startY;
    if (delta < -40) setExpanded(true);
    else if (delta > 40) {
      if (expanded) setExpanded(false);
      else onClose();
    }
  };

  useEffect(() => {
    setTab("lineup");
    setExpanded(false);
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
    if (!color || typeof color !== "string")
      return `rgba(255, 255, 255, ${alpha})`;
    let cleanHex = color.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  };

  // Dùng lightMode: đây mới là màu thương hiệu THẬT của đội (vd Algeria xanh lá #00977B).
  // darkMode đôi khi bị FotMob đơn giản hoá về trắng/đen (chỉ để tương phản chữ trên nền tối),
  // không phản ánh đúng màu đội nên không hợp để tô gradient trang trí.
  const homeColor = stats?.teamColors?.lightMode?.home || stats?.teamColors?.darkMode?.home || "#334BFF";
  const awayColor = stats?.teamColors?.lightMode?.away || stats?.teamColors?.darkMode?.away || "#FFA07A";
  const pen = stats?.pen || match.pen || null;

  // Gradient theo màu 2 đội trải suốt TOÀN BỘ khung (không dừng lại ở header) — giống thẻ trận
  // Apple Sports. Dùng hướng NGANG (gần 100deg) thay vì chéo dọc: gradient chéo dọc chỉ lộ rõ
  // khi khung thấp (peek), còn khi full màn hình (khung rất cao) phần header chỉ rơi đúng đoạn
  // đầu dải màu (toàn đỏ) — ngang thì luôn thấy đủ 2 màu ở MỌI chiều cao khung.
  const containerStyle = {
    background: `linear-gradient(100deg, ${alphaColor(homeColor, 0.5)} 0%, ${alphaColor(homeColor, 0.22)} 28%, #0d1226 52%, ${alphaColor(awayColor, 0.22)} 74%, ${alphaColor(awayColor, 0.5)} 100%)`,
  };

  const Section = ({ title, children }) => (
    <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-3 shadow-md">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        {title}
      </span>
      {children}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full sm:max-w-lg sm:h-auto sm:max-h-[92dvh] flex flex-col border border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          expanded ? "h-[100dvh] rounded-none" : "h-[66vh] rounded-t-3xl"
        }`}
        style={{
          ...containerStyle,
          // Full màn hình (rounded-none) đụng thẳng status bar — chỉ cần bù safe-area lúc đó,
          // dạng peek đã cách top một khoảng nên không cần.
          paddingTop: expanded ? "env(safe-area-inset-top, 0px)" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/tab bar KHÔNG có nền riêng — dùng chung gradient của containerStyle (trải suốt
            toàn khung) để không bị ngắt màu đột ngột giữa header và phần nội dung cuộn. */}
        <div className="relative shrink-0 overflow-hidden">
          {/* Tay cầm kéo (chỉ mobile) — vuốt lên để full màn hình, vuốt xuống để thu gọn/đóng. */}
          <div
            className="sm:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => dragStart(e.clientY)}
            onPointerUp={(e) => dragEnd(e.clientY)}
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="w-9 h-1.5 rounded-full bg-white/30" />
          </div>

          {expanded ? (
            <div className="relative px-4 py-2.5 flex items-center gap-3">
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
              <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0">
                <Badge id={match.home.id} name={match.home.name} size="sm" />
                <span className="text-lg font-black text-white tabular-nums shrink-0">
                  {match.finished || isLive
                    ? (stats?.liveScore?.home ?? match.home.score ?? 0)
                    : ""}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider shrink-0 px-1 ${isLive ? "text-[#ff8a8a]" : "text-white/50"}`}
                >
                  {isLive
                    ? stats?.liveMinute || match.liveTime || "Đang đá"
                    : match.finished
                      ? match.statusShort || "KT"
                      : vnShortDateTime(match.utcTime)}
                </span>
                <span className="text-lg font-black text-white tabular-nums shrink-0">
                  {match.finished || isLive
                    ? (stats?.liveScore?.away ?? match.away.score ?? 0)
                    : ""}
                </span>
                <Badge id={match.away.id} name={match.away.name} size="sm" />
              </div>
              <span className="w-7 shrink-0" />
            </div>
          ) : (
            <div className="relative px-4 pt-4 pb-4">
              <button
                onClick={onClose}
                className="absolute top-2 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="text-4xl font-black text-white tabular-nums text-center">
                  {match.finished || isLive
                    ? (stats?.liveScore?.home ?? match.home.score ?? 0)
                    : ""}
                </span>
                <div className="flex flex-col items-center gap-0.5 px-3 min-w-[64px]">
                  {match.finished || isLive ? null : (
                    <span className="text-sm font-black text-white tabular-nums">
                      {vnShortDateTime(match.utcTime)}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${isLive ? "text-[#ff8a8a]" : "text-white/50"}`}
                  >
                    {isLive
                      ? stats?.liveMinute || match.liveTime || "Đang đá"
                      : match.finished
                        ? match.statusShort || "Kết thúc"
                        : "Sắp đá"}
                  </span>
                  {pen && (
                    <span className="text-[11px] font-black text-[#FFB454] tabular-nums mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                      ({pen.home} - {pen.away})
                    </span>
                  )}
                </div>
                <span className="text-4xl font-black text-white tabular-nums text-center">
                  {match.finished || isLive
                    ? (stats?.liveScore?.away ?? match.away.score ?? 0)
                    : ""}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mt-3">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <Badge id={match.home.id} name={match.home.name} />
                  <span className="flex items-center gap-1 max-w-full">
                    <span className="text-xs font-bold text-white text-center truncate">
                      {match.home.name}
                    </span>
                    <FollowStar team={match.home} leagueId={leagueId} />
                  </span>
                  {stats?.events
                    ?.filter(
                      (e) => e.type === "Goal" && e.team === match.home.name,
                    )
                    .map((e, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-white/50 font-medium text-center"
                      >
                        {e.player} {e.minute != null ? `${e.minute}'` : ""}
                      </span>
                    ))}
                </div>
                <div className="w-[64px] shrink-0" />
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <Badge id={match.away.id} name={match.away.name} />
                  <span className="flex items-center gap-1 max-w-full">
                    <FollowStar team={match.away} leagueId={leagueId} />
                    <span className="text-xs font-bold text-white text-center truncate">
                      {match.away.name}
                    </span>
                  </span>
                  {stats?.events
                    ?.filter(
                      (e) => e.type === "Goal" && e.team === match.away.name,
                    )
                    .map((e, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-white/50 font-medium text-center"
                      >
                        {e.player} {e.minute != null ? `${e.minute}'` : ""}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab bar — chữ phẳng, không khối/viền, liền nền gradient phía trên như bản gốc */}
          {!(loading && !stats) && (
            <div className="flex items-center gap-1 px-3 pt-1 pb-2.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                    tab === t.key
                      ? "text-white"
                      : "text-white/45 hover:text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body — chỉ cần scroll/chạm-kéo trong nội dung khi đang ở dạng peek là tự bung full
            màn hình luôn (không cần đúng thao tác vuốt tay cầm), giống bottom sheet của iOS. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs text-slate-300"
          onWheel={() => {
            if (!expanded) setExpanded(true);
          }}
          onTouchMove={() => {
            if (!expanded) setExpanded(true);
          }}
        >
          {loading && !stats ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {tab === "lineup" &&
                (stats?.lineups ? (
                  <LineupPitch
                    lineups={stats.lineups}
                    homeColor={homeColor}
                    awayColor={awayColor}
                  />
                ) : (
                  <div className="text-center py-10 text-[11px] text-slate-500">
                    Chưa có đội hình ra sân.
                  </div>
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
                  </Section>
                ) : (
                  <div className="text-center py-10 text-[11px] text-slate-500">
                    Chưa có diễn biến trận đấu.
                  </div>
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
                                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                                  {label}
                                </span>
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
                                      boxShadow: `0 0 6px ${homeColor}`,
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
                                      boxShadow: `0 0 6px ${awayColor}`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {isLive && (
                        <div className="text-[9px] text-slate-500 text-center">
                          Tự cập nhật mỗi 30s khi trận đang diễn ra
                        </div>
                      )}
                    </Section>
                  )}

                  <Section title="So sánh phong độ">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center pb-2 border-b border-white/5">
                      <div className="flex items-center gap-1.5 justify-start min-w-0">
                        <Badge
                          id={match.home.id}
                          name={match.home.name}
                          size="sm"
                        />
                        <span className="font-bold text-white truncate text-xs">
                          {match.home.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 px-2 shrink-0">
                        VS
                      </span>
                      <div className="flex items-center gap-1.5 justify-end min-w-0">
                        <span className="font-bold text-white truncate text-xs text-right">
                          {match.away.name}
                        </span>
                        <Badge
                          id={match.away.id}
                          name={match.away.name}
                          size="sm"
                        />
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
                        <span>
                          {[stats.venue, stats.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
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
                              <span className="font-semibold text-white truncate text-[11px] text-right">
                                {g.home}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/5 text-white font-mono font-black text-[11px] shrink-0 min-w-[38px] text-center">
                                {g.homeGoals ?? "-"} - {g.awayGoals ?? "-"}
                              </span>
                              <span className="font-semibold text-white truncate text-[11px] text-left">
                                {g.away}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 text-center py-2">
                        Không có dữ liệu đối đầu gần đây.
                      </div>
                    )}
                  </Section>
                </>
              )}

              <p className="text-[10px] text-slate-600 text-center font-medium">
                Nguồn dữ liệu: FotMob
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
