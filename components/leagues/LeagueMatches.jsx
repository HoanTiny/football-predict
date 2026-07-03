"use client";

import { useEffect, useMemo, useState } from "react";
import { vnDateKey, vnDateHeader, vnShortDateTime } from "@/lib/time";
import { teamLogo } from "@/lib/leagues";
import { flagImgOf } from "@/lib/constants";
import MatchRow from "./MatchRow";

const VIEW_TABS = [
  { key: "yesterday", label: "Hôm qua" },
  { key: "today", label: "Hôm nay" },
  { key: "upcoming", label: "Sắp tới" },
];

const pad2 = (n) => String(n).padStart(2, "0");

// Crest to, kiểu thẻ "trận nổi bật" của HomeTab — dùng riêng ở đây vì cần cỡ lớn hơn TeamLogo.
const BigCrest = ({ id, name }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  const fallbackUrl = !url || err ? flagImgOf(name) : null;
  if (fallbackUrl) {
    return <img src={fallbackUrl} alt={name} className="w-14 h-14 object-cover rounded-full shrink-0 border border-white/25" />;
  }
  if (!url || err) {
    return (
      <div className="w-14 h-14 rounded-full bg-white/10 border border-white/25 flex items-center justify-center text-xs font-bold text-white/70 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className="w-14 h-14 object-contain shrink-0" />;
};

/** Đếm ngược tới trận SẮP TỚI GẦN NHẤT của giải (không phụ thuộc tab đang chọn). */
function NextMatchCountdown({ match, league, onSelect }) {
  const [left, setLeft] = useState(null);

  useEffect(() => {
    const target = new Date(match.utcTime).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLeft({ h: 0, m: 0, s: 0 });
        return;
      }
      setLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [match.utcTime]);

  if (!left) return null;

  return (
    <button
      onClick={() => onSelect(match)}
      className="w-full text-left rounded-[28px] p-6 bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.25)] hover:bg-white/[0.14] transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-4">
        <span className="truncate">{match.home.name}</span>
        <span className="truncate text-right">{match.away.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <BigCrest id={match.home.id} name={match.home.name} />
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{league.name}</span>
          <div className="flex items-center gap-1 font-mono tabular-nums">
            <span className="text-2xl font-black text-white">{pad2(left.h)}</span>
            <span className="text-lg font-black text-white/40">:</span>
            <span className="text-2xl font-black text-white">{pad2(left.m)}</span>
            <span className="text-lg font-black text-white/40">:</span>
            <span className="text-2xl font-black text-white">{pad2(left.s)}</span>
          </div>
          <span className="text-[10px] font-extrabold text-[#a5b4ff] uppercase tracking-widest">
            {vnShortDateTime(match.utcTime)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <BigCrest id={match.away.id} name={match.away.name} />
        </div>
      </div>
    </button>
  );
}

/** Lịch + kết quả một giải. Mặc định 3 tab nhanh Hôm qua/Hôm nay/Sắp tới; có nút mở cả mùa. */
export default function LeagueMatches({ league, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState("today");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setShowAll(false);
    setView("today");
    fetch(`/api/leagues/fixtures?id=${league.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.matches || j.matches.length === 0) setError(true);
        else setData(j);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [league.id]);

  const todayKeyStr = useMemo(() => vnDateKey(new Date().toISOString()), []);
  const yesterdayKeyStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return vnDateKey(y.toISOString());
  }, []);

  // Tab nhanh: lọc trực tiếp trên danh sách cả mùa đã tải (không gọi API thêm).
  const quickFiltered = useMemo(() => {
    if (!data) return [];
    if (view === "yesterday") {
      return data.matches
        .filter((m) => vnDateKey(m.utcTime) === yesterdayKeyStr)
        .sort((a, b) => new Date(b.utcTime) - new Date(a.utcTime));
    }
    if (view === "today") {
      return data.matches
        .filter((m) => vnDateKey(m.utcTime) === todayKeyStr)
        .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    }
    return data.matches
      .filter((m) => new Date(m.utcTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
  }, [data, view, todayKeyStr, yesterdayKeyStr]);

  // "Xem toàn bộ mùa giải": kết quả MỚI NHẤT lên đầu; trận CHƯA đá xếp gần nhất trước, nối phía
  // dưới — tránh trận rất xa tương lai (vd chung kết, đội còn TBD) nhảy lên đầu danh sách.
  const fullSeasonOrdered = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const past = data.matches
      .filter((m) => new Date(m.utcTime).getTime() <= now)
      .sort((a, b) => new Date(b.utcTime) - new Date(a.utcTime));
    const future = data.matches
      .filter((m) => new Date(m.utcTime).getTime() > now)
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    return [...past, ...future];
  }, [data]);

  const ordered = showAll ? fullSeasonOrdered : quickFiltered;

  // Trận sắp tới GẦN NHẤT của giải (bất kể đang chọn tab nào) — hiện đếm ngược phía trên danh sách.
  const nextMatch = useMemo(() => {
    if (!data) return null;
    const upcoming = data.matches
      .filter((m) => new Date(m.utcTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    return upcoming[0] || null;
  }, [data]);

  const byDate = useMemo(() => {
    const groups = [];
    let lastKey = null;
    for (const m of ordered) {
      const key = vnDateKey(m.utcTime);
      if (key !== lastKey) {
        groups.push({ key, header: vnDateHeader(m.utcTime), items: [] });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [ordered]);

  const emptyQuickMsg = {
    yesterday: "Không có trận nào của giải hôm qua.",
    today: "Không có trận nào của giải hôm nay.",
    upcoming: "Chưa có lịch sắp tới được công bố.",
  }[view];

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[68px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📅</div>
        <p className="text-xs text-white/50 font-medium">Chưa có lịch thi đấu cho giải này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {nextMatch && <NextMatchCountdown match={nextMatch} league={league} onSelect={onSelect} />}
      {!showAll && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  view === t.key ? "bg-white/25 text-white" : "text-white/60 hover:text-white/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setShowAll((v) => !v)}
        className="w-full py-2 rounded-full text-[11px] font-bold text-white/60 bg-white/10 border border-white/15 backdrop-blur-xl hover:text-white hover:bg-white/15 transition-all"
      >
        {showAll ? "↓ Thu gọn (Hôm qua / Hôm nay / Sắp tới)" : `↑ Xem toàn bộ lịch mùa giải (${data.matches.length} trận)`}
      </button>
      {byDate.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-xs text-white/50 font-medium">{emptyQuickMsg}</p>
        </div>
      )}
      {byDate.map((g) => (
        <div key={g.key} className="space-y-2.5">
          <div className="flex items-center gap-2.5 pt-1">
            <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest shrink-0">
              {g.header}
            </h3>
            <span className="h-px flex-grow bg-white/10 rounded-full" />
          </div>
          <div className="space-y-2">
            {g.items.map((m) => (
              <MatchRow key={m.id} m={m} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-white/40 text-center font-medium">Nguồn dữ liệu: FotMob</p>
    </div>
  );
}
