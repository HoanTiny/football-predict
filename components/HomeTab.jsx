"use client";

import { useState, useEffect, useMemo } from "react";
import { leagueLogo, teamLogo } from "@/lib/leagues";
import MatchRow from "./leagues/MatchRow";
import MatchDetailSheet from "./leagues/MatchDetailSheet";

const WEEKDAYS_VN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const pad = (n) => String(n).padStart(2, "0");

/** "YYYYMMDD" theo giờ ĐỊA PHƯƠNG của máy (khớp cách hiển thị giờ trong toàn app). */
function dayKey(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function dayLabel(d, todayKey) {
  const key = dayKey(d);
  if (key === todayKey) return "Hôm nay";
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  if (key === dayKey(tmr)) return "Ngày mai";
  const ytd = new Date();
  ytd.setDate(ytd.getDate() - 1);
  if (key === dayKey(ytd)) return "Hôm qua";
  return `${WEEKDAYS_VN[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

const LeagueLogoImg = ({ id, name }) => {
  const [err, setErr] = useState(false);
  if (err) return <span className="text-base shrink-0">🏆</span>;
  return (
    <img
      src={leagueLogo(id)}
      alt={name}
      onError={() => setErr(true)}
      className="w-5 h-5 object-contain shrink-0"
    />
  );
};

const TeamCrest = ({ id, name, size = "w-14 h-14" }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  if (!url || err) {
    return (
      <div className={`${size} rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0`}>
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className={`${size} object-contain shrink-0`} />;
};

/** Card nổi bật cho trận ĐANG DIỄN RA — kiểu spotlight của Apple Sports. */
function FeaturedMatch({ m, leagueName, onSelect }) {
  return (
    <button
      onClick={() => onSelect(m)}
      className="w-full text-left rounded-[28px] p-6 bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.25)] hover:bg-white/[0.14] transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-4">
        <span className="truncate">{m.home.name}</span>
        <span className="truncate text-right">{m.away.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamCrest id={m.home.id} name={m.home.name} />
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{leagueName}</span>
          <div className="flex items-center gap-2 text-4xl font-black text-white tabular-nums">
            <span>{m.home.score ?? 0}</span>
            <span className="w-2 h-2 rounded-full bg-[#ff5a5a] animate-pulse" />
            <span>{m.away.score ?? 0}</span>
          </div>
          <span className="text-[10px] font-extrabold text-[#ff8a8a] uppercase tracking-widest">
            {m.liveTime || m.statusShort || "Đang đá"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamCrest id={m.away.id} name={m.away.name} />
        </div>
      </div>
    </button>
  );
}

const VIEW_TABS = [
  { key: "yesterday", label: "Hôm qua", offset: -1 },
  { key: "today", label: "Hôm nay", offset: 0 },
  { key: "upcoming", label: "Sắp tới", offset: null }, // null = nhiều ngày, không phải 1 ngày cố định
];
const UPCOMING_SPAN_DAYS = 7; // "Sắp tới" gộp 7 ngày kế tiếp (không chỉ ngày mai)

/**
 * TAB "Hôm nay" — trang chủ mặc định: lịch + kết quả TẤT CẢ giải, gom theo giải đấu.
 * 3 chế độ kiểu Apple Sports: Hôm qua / Hôm nay (1 ngày) / Sắp tới (gộp nhiều ngày tới).
 * Nguồn: FotMob (/api/schedule).
 */
export default function HomeTab() {
  const [view, setView] = useState("today"); // "yesterday" | "today" | "upcoming"
  const [selected, setSelected] = useState(null);

  // --- Chế độ 1 ngày (Hôm qua / Hôm nay) ---
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const todayKey = useMemo(() => dayKey(new Date()), []);
  const singleDate = useMemo(() => {
    const d = new Date();
    const tab = VIEW_TABS.find((t) => t.key === view);
    if (tab?.offset) d.setDate(d.getDate() + tab.offset);
    return d;
  }, [view]);
  const singleKey = useMemo(() => dayKey(singleDate), [singleDate]);

  useEffect(() => {
    if (view === "upcoming") return;
    let alive = true;
    setLoading(true);
    setError(false);
    fetch(`/api/schedule?date=${singleKey}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.error) setError(true);
        else setData(j);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [view, singleKey]);

  // --- Chế độ "Sắp tới": gộp UPCOMING_SPAN_DAYS ngày kế tiếp, nhóm theo NGÀY rồi theo giải ---
  const [upcomingDays, setUpcomingDays] = useState(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState(false);

  useEffect(() => {
    if (view !== "upcoming" || upcomingDays) return;
    let alive = true;
    setUpcomingLoading(true);
    setUpcomingError(false);
    const dates = Array.from({ length: UPCOMING_SPAN_DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + 1 + i);
      return d;
    });
    Promise.all(
      dates.map((d) =>
        fetch(`/api/schedule?date=${dayKey(d)}`)
          .then((r) => r.json())
          .catch(() => ({ leagues: [] }))
      )
    )
      .then((results) => {
        if (!alive) return;
        const days = dates
          .map((d, i) => {
            const targetKey = dayKey(d);
            const filteredLeagues = (results[i]?.leagues || [])
              .map((lg) => {
                const filteredMatches = (lg.matches || []).filter(
                  (m) => dayKey(new Date(m.utcTime)) === targetKey
                );
                return { ...lg, matches: filteredMatches };
              })
              .filter((lg) => lg.matches.length > 0);
            return {
              dateKey: targetKey,
              dateLabel: dayLabel(d, todayKey),
              leagues: filteredLeagues,
            };
          })
          .filter((day) => day.leagues.length > 0);
        setUpcomingDays(days);
      })
      .catch(() => alive && setUpcomingError(true))
      .finally(() => alive && setUpcomingLoading(false));
    return () => {
      alive = false;
    };
  }, [view, todayKey, upcomingDays]);

  const leagues = useMemo(() => {
    if (!data?.leagues) return [];
    return data.leagues
      .map((lg) => {
        const filteredMatches = (lg.matches || []).filter(
          (m) => dayKey(new Date(m.utcTime)) === singleKey
        );
        return { ...lg, matches: filteredMatches };
      })
      .filter((lg) => lg.matches.length > 0);
  }, [data, singleKey]);
  const hasAnyMatch = leagues.some((lg) => lg.matches.length > 0);
  const hasAnyUpcoming = (upcomingDays || []).length > 0;

  // Trận nổi bật: ĐANG ĐÁ đầu tiên tìm thấy (chỉ áp dụng chế độ 1 ngày — "Sắp tới" là tương lai
  // nên không có trận live) — kiểu spotlight Apple Sports.
  const featured = useMemo(() => {
    if (view === "upcoming") return null;
    for (const lg of leagues) {
      const m = lg.matches.find((x) => x.started && !x.finished && !x.cancelled);
      if (m) return { match: m, leagueName: lg.name };
    }
    return null;
  }, [leagues, view]);

  return (
    <div className="space-y-5">
      {/* Section title */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60 mb-1">
          BÓNG ĐÁ HÔM NAY
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          Lịch &amp; Kết quả
        </h2>
      </div>

      {/* 3 tab kính mờ: Hôm qua / Hôm nay / Sắp tới */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                view === t.key ? "bg-white/25 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {view !== "upcoming" && (
        <div className="text-center text-[10px] text-white/40 font-medium -mt-3">
          {pad(singleDate.getDate())}/{pad(singleDate.getMonth() + 1)}/{singleDate.getFullYear()}
        </div>
      )}

      {/* Nội dung */}
      {view === "upcoming" ? (
        upcomingLoading ? (
          <div className="space-y-2.5 max-w-2xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : upcomingError ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">⚠️</div>
            <p className="text-xs text-white/50 font-medium">Không tải được lịch thi đấu.</p>
          </div>
        ) : !hasAnyUpcoming ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">📅</div>
            <p className="text-xs text-white/50 font-medium">
              Chưa có lịch của các giải theo dõi trong {UPCOMING_SPAN_DAYS} ngày tới.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {upcomingDays.map((day) => (
              <div key={day.dateKey} className="space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-widest shrink-0">
                    {day.dateLabel}
                  </h3>
                  <span className="h-px flex-grow bg-white/10 rounded-full" />
                </div>
                {day.leagues.map((lg) => (
                  <div key={lg.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <LeagueLogoImg id={lg.id} name={lg.name} />
                      <h4 className="text-xs font-bold text-white/90 truncate">{lg.name}</h4>
                    </div>
                    <div className="space-y-2">
                      {lg.matches.map((m) => (
                        <MatchRow key={m.id} m={m} onSelect={setSelected} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <p className="text-[10px] text-white/40 text-center font-medium">Nguồn dữ liệu: FotMob</p>
          </div>
        )
      ) : loading ? (
        <div className="space-y-2.5 max-w-2xl mx-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[68px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">⚠️</div>
          <p className="text-xs text-white/50 font-medium">Không tải được lịch thi đấu.</p>
        </div>
      ) : !hasAnyMatch ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-xs text-white/50 font-medium">
            Không có trận nào của các giải theo dõi trong ngày này.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-5">
          {featured && (
            <FeaturedMatch m={featured.match} leagueName={featured.leagueName} onSelect={setSelected} />
          )}
          {leagues
            .filter((lg) => lg.matches.length > 0)
            .map((lg) => (
              <div key={lg.id} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <LeagueLogoImg id={lg.id} name={lg.name} />
                  <h3 className="text-xs font-bold text-white/90 truncate">{lg.name}</h3>
                </div>
                <div className="space-y-2">
                  {lg.matches.map((m) => (
                    <MatchRow key={m.id} m={m} onSelect={setSelected} />
                  ))}
                </div>
              </div>
            ))}
          <p className="text-[10px] text-white/40 text-center font-medium">Nguồn dữ liệu: FotMob</p>
        </div>
      )}

      {selected && <MatchDetailSheet match={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
