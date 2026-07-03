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
  { key: "all", label: "Tất cả" },
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

/** Trận ĐANG DIỄN RA — ưu tiên hiện thay cho đếm ngược khi giải có trận live. Cùng kiểu
 * "spotlight" gọn nhẹ với FeaturedMatch của HomeTab (kính mờ trắng, không viền đỏ nổi bật). */
function LiveMatchFeatured({ match, league, onSelect }) {
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
          <div className="flex items-center gap-2 text-4xl font-black text-white tabular-nums">
            <span>{match.home.score ?? 0}</span>
            <span className="w-2 h-2 rounded-full bg-[#ff5a5a] animate-pulse" />
            <span>{match.away.score ?? 0}</span>
          </div>
          <span className="text-[10px] font-extrabold text-[#ff8a8a] uppercase tracking-widest">
            {match.liveTime || match.statusShort || "Đang đá"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <BigCrest id={match.away.id} name={match.away.name} />
        </div>
      </div>
    </button>
  );
}

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
  const [view, setView] = useState("today");

  useEffect(() => {
    let alive = true;
    setData(null);
    setLoading(true);
    setError(false);
    setView("today");

    const load = (silent) => {
      if (!silent) setLoading(true);
      fetch(`/api/leagues/fixtures?id=${league.id}`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (!j.matches || j.matches.length === 0) {
            if (!silent) setError(true);
          } else {
            setData(j);
            setError(false);
          }
        })
        .catch(() => alive && !silent && setError(true))
        .finally(() => alive && setLoading(false));
    };

    load(false);
    // Tự làm mới định kỳ để tỉ số/phút trận đang live không bị đứng yên trên màn hình (giống
    // HomeTab) — trước đây trang giải chỉ tải 1 lần lúc mount, phải F5 mới thấy cập nhật.
    const iv = setInterval(() => load(true), 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [league.id]);

  const todayKeyStr = useMemo(() => vnDateKey(new Date().toISOString()), []);
  const yesterdayKeyStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return vnDateKey(y.toISOString());
  }, []);

  // Tab nhanh: lọc trực tiếp trên danh sách cả mùa đã tải (không gọi API thêm).
  const ordered = useMemo(() => {
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
    if (view === "all") {
      // "Tất cả": kết quả MỚI NHẤT lên đầu; trận CHƯA đá xếp gần nhất trước, nối phía dưới —
      // tránh trận rất xa tương lai (vd chung kết, đội còn TBD) nhảy lên đầu danh sách.
      const now = Date.now();
      const past = data.matches
        .filter((m) => new Date(m.utcTime).getTime() <= now)
        .sort((a, b) => new Date(b.utcTime) - new Date(a.utcTime));
      const future = data.matches
        .filter((m) => new Date(m.utcTime).getTime() > now)
        .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
      return [...past, ...future];
    }
    return data.matches
      .filter((m) => new Date(m.utcTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
  }, [data, view, todayKeyStr, yesterdayKeyStr]);

  // Trận ĐANG ĐÁ của giải (nếu có) — ưu tiên hiện thay cho đếm ngược trận sắp tới.
  const liveMatch = useMemo(() => {
    if (!data) return null;
    return data.matches.find((m) => m.started && !m.finished && !m.cancelled) || null;
  }, [data]);

  // Trận sắp tới GẦN NHẤT của giải (bất kể đang chọn tab nào) — hiện đếm ngược phía trên danh sách,
  // CHỈ khi giải không có trận nào đang đá (live luôn ưu tiên hơn).
  const nextMatch = useMemo(() => {
    if (!data || liveMatch) return null;
    const upcoming = data.matches
      .filter((m) => new Date(m.utcTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    return upcoming[0] || null;
  }, [data, liveMatch]);

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
    all: "Chưa có lịch thi đấu cho giải này.",
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
      {liveMatch ? (
        <LiveMatchFeatured match={liveMatch} league={league} onSelect={onSelect} />
      ) : (
        nextMatch && <NextMatchCountdown match={nextMatch} league={league} onSelect={onSelect} />
      )}
      {byDate.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-xs text-white/50 font-medium">{emptyQuickMsg}</p>
        </div>
      )}
      {byDate.map((g, i) => (
        // "Tất cả": cùng 1 ngày có thể xuất hiện ở 2 đoạn KHÔNG liền nhau (trận đã đá hôm nay
        // nằm trong đoạn "past", trận hôm nay chưa đá nằm trong đoạn "future") → 2 group riêng
        // biệt trùng g.key, phải ghép thêm index để key React không bị đụng nhau.
        <div key={`${g.key}-${i}`} className="space-y-2.5">
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
