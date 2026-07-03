"use client";

import { useEffect, useMemo, useState } from "react";
import { LEAGUES, leagueLogo } from "@/lib/leagues";

const pad = (n) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

const LeagueLogoImg = ({ id, name }) => {
  const [err, setErr] = useState(false);
  if (err) return <span className="text-2xl">🏆</span>;
  return (
    <img
      src={leagueLogo(id)}
      alt={name}
      onError={() => setErr(true)}
      className="w-10 h-10 object-contain"
    />
  );
};

/** Trang "Tìm kiếm" kiểu Apple Sports — lưới các giải, có ô lọc theo tên + badge Trực tiếp. */
export default function SearchLeagues({ onSelectLeague, onClose }) {
  const [query, setQuery] = useState("");
  const [liveIds, setLiveIds] = useState(new Set());

  useEffect(() => {
    let alive = true;
    fetch(`/api/schedule?date=${todayKey()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const ids = new Set(
          (j.leagues || [])
            .filter((lg) => lg.matches.some((m) => m.started && !m.finished && !m.cancelled))
            .map((lg) => String(lg.id))
        );
        setLiveIds(ids);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEAGUES;
    return LEAGUES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.short.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
        >
          ‹
        </button>
        <h2 className="text-sm font-black text-white">Tìm kiếm giải đấu</h2>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Giải đấu…"
        autoFocus
        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-colors"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🔍</div>
          <p className="text-xs text-white/50 font-medium">Không tìm thấy giải đấu nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectLeague(l)}
              className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.12] transition-colors"
            >
              {liveIds.has(String(l.id)) && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider text-white bg-[#ff5a5a]">
                  Trực tiếp
                </span>
              )}
              <LeagueLogoImg id={l.id} name={l.name} />
              <span className="text-[11px] font-bold text-white text-center leading-tight line-clamp-2">
                {l.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
