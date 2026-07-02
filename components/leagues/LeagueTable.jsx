"use client";

import { useEffect, useState } from "react";
import { teamLogo } from "@/lib/leagues";

const TeamLogo = ({ id, name }) => {
  const [err, setErr] = useState(false);
  const url = teamLogo(id);
  if (!url || err) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setErr(true)}
      className="w-6 h-6 object-contain shrink-0"
    />
  );
};

function StandingsTable({ rows }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-xs text-left text-white/85 min-w-[520px] border-collapse">
        <thead className="text-[10px] font-bold text-white/50 uppercase tracking-wider border-b border-white/10">
          <tr>
            <th className="py-2.5 px-3 text-center w-10">#</th>
            <th className="py-2.5 px-2 text-left">Đội</th>
            <th className="py-2.5 px-1 text-center w-9" title="Số trận">Tr</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#8fffc9]" title="Thắng">T</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#ffcba0]" title="Hòa">H</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#ff9a9a]" title="Thua">B</th>
            <th className="py-2.5 px-2 text-center w-12" title="Hiệu số">HS</th>
            <th className="py-2.5 px-2 text-center w-12 text-white font-extrabold" title="Điểm">Đ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((t) => (
            <tr key={t.teamId ?? t.rank} className="h-11 hover:bg-white/[0.04] transition-colors">
              <td className="py-2 px-3 text-center font-bold text-white/60">
                <span className="inline-flex items-center gap-1.5 justify-center">
                  {t.qualColor && (
                    <svg viewBox="0 0 10 10" className="w-2 h-2 shrink-0" style={{ fill: t.qualColor }}>
                      <polygon points="0,0 10,5 0,10" />
                    </svg>
                  )}
                  {t.rank}
                </span>
              </td>
              <td className="py-2 px-2 font-bold text-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TeamLogo id={t.teamId} name={t.name} />
                  <span className="truncate">{t.name}</span>
                  {t.ongoing && (
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" title="Đang đá" />
                  )}
                </div>
              </td>
              <td className="py-2 px-1 text-center text-white/60 tabular-nums">{t.played}</td>
              <td className="py-2 px-1 text-center text-white/75 tabular-nums">{t.wins}</td>
              <td className="py-2 px-1 text-center text-white/75 tabular-nums">{t.draws}</td>
              <td className="py-2 px-1 text-center text-white/75 tabular-nums">{t.losses}</td>
              <td
                className={`py-2 px-2 text-center font-bold tabular-nums ${
                  t.gd > 0 ? "text-[#8fffc9]" : t.gd < 0 ? "text-[#ff9a9a]" : "text-white/60"
                }`}
              >
                {t.gd > 0 ? `+${t.gd}` : t.gd}
              </td>
              <td className="py-2 px-2 text-center font-extrabold text-white text-sm tabular-nums">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bảng vua phá lưới / vua kiến tạo (từ FotMob). */
function TopStatsTable({ rows, statLabel, loading, empty }) {
  if (loading) {
    return (
      <div className="space-y-3.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-11 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!rows || !rows.length) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🏆</div>
        <p className="text-xs text-white/50 font-medium">
          {empty || "Chưa có dữ liệu."}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[24px] bg-white/[0.07] border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_28px_rgba(0,0,0,0.2)] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Top <span className="text-[#334BFF] font-black">{statLabel}</span>
        </h4>
        <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest">
          Nguồn: FotMob
        </span>
      </div>
      <ul className="m-0 p-0 list-none divide-y divide-white/5">
        {rows.slice(0, 20).map((p, idx) => {
          const rank = idx + 1;
          const logoUrl = p.teamId ? teamLogo(p.teamId) : null;
          return (
            <li key={p.id || rank} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
              <span
                className={`w-5 text-center text-xs font-black tabular-nums ${
                  rank <= 3 ? "text-[#62F2C0]" : "text-white/50"
                }`}
              >
                {rank}
              </span>
              {p.photo ? (
                <img
                  src={p.photo}
                  alt={p.name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="w-8 h-8 rounded-full object-cover bg-white/10 border border-white/10 shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/10 border border-white/10 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-white truncate">{p.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/60 truncate">
                  {logoUrl && (
                    <img src={logoUrl} alt={p.teamName} className="w-3.5 h-3.5 object-contain" />
                  )}
                  <span className="truncate">{p.teamName}</span>
                </div>
              </div>
              <span className="text-base font-black text-white tabular-nums shrink-0">{p.value}</span>
            </li>
          );
        })}
      </ul>
      <div className="px-4 py-2 text-[9px] text-white/50 text-center border-t border-white/10">
        Cập nhật theo lịch trận đã đá · Top 20
      </div>
    </div>
  );
}

/** BXH một giải — tự fetch theo leagueId. Hỗ trợ cả giải chia bảng (World Cup, UCL). */
export default function LeagueTable({ league }) {
  const [view, setView] = useState("table"); // "table" | "scorers" | "assists"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [topStats, setTopStats] = useState(null); // { scorers, assists }
  const [topLoading, setTopLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetch(`/api/leagues/table?id=${league.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.groups || j.groups.length === 0) setError(true);
        else setData(j);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [league.id]);

  useEffect(() => {
    if ((view !== "scorers" && view !== "assists") || topStats) return;
    let active = true;
    setTopLoading(true);
    fetch(`/api/top-stats?id=${league.id}`)
      .then((r) => r.json())
      .then((d) => active && setTopStats(d || { scorers: [], assists: [] }))
      .catch(() => active && setTopStats({ scorers: [], assists: [] }))
      .finally(() => active && setTopLoading(false));
    return () => {
      active = false;
    };
  }, [view, topStats, league.id]);

  return (
    <div className="space-y-4">
      {/* Switcher: Standings / Scorers / Assists */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
          {[
            { key: "table", label: "Bảng xếp hạng" },
            { key: "scorers", label: "Vua phá lưới" },
            { key: "assists", label: "Vua kiến tạo" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                view === t.key
                  ? "bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-11 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : error || !data ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <p className="text-xs text-white/50 font-medium">
              Chưa có bảng xếp hạng cho giải này.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.groups.map((g, i) => (
              <div
                key={i}
                className="rounded-[24px] bg-white/[0.07] border border-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_28px_rgba(0,0,0,0.2)] overflow-hidden"
              >
                <div className="px-4 py-3 text-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {g.name || data.leagueName || league.name}
                  </h4>
                </div>
                <StandingsTable rows={g.rows} />
              </div>
            ))}
            <p className="text-[10px] text-white/40 text-center font-medium">
              Nguồn dữ liệu: FotMob
            </p>
          </div>
        )
      ) : view === "scorers" ? (
        <TopStatsTable
          rows={topStats?.scorers || []}
          statLabel="ghi bàn"
          loading={topLoading}
          empty="Chưa có bàn thắng nào — giải mới bắt đầu."
        />
      ) : (
        <TopStatsTable
          rows={topStats?.assists || []}
          statLabel="kiến tạo"
          loading={topLoading}
          empty="Chưa có kiến tạo nào — giải mới bắt đầu."
        />
      )}
    </div>
  );
}
