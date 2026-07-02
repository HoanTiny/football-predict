"use client";

import { useEffect, useMemo, useState } from "react";
import { vnDateKey, vnDateHeader } from "@/lib/time";
import MatchRow from "./MatchRow";

const VIEW_TABS = [
  { key: "yesterday", label: "Hôm qua" },
  { key: "today", label: "Hôm nay" },
  { key: "upcoming", label: "Sắp tới" },
];

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
