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
      <table className="w-full text-xs text-left text-slate-300 min-w-[520px] border-collapse">
        <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-slate-900/25">
          <tr>
            <th className="py-2.5 px-3 text-center w-10">#</th>
            <th className="py-2.5 px-2 text-left">Đội</th>
            <th className="py-2.5 px-1 text-center w-9" title="Số trận">Tr</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#62F2C0]" title="Thắng">T</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#FFA07A]" title="Hòa">H</th>
            <th className="py-2.5 px-1 text-center w-8 text-[#ff5a5a]" title="Thua">B</th>
            <th className="py-2.5 px-2 text-center w-12" title="Hiệu số">HS</th>
            <th className="py-2.5 px-2 text-center w-12 text-white font-extrabold" title="Điểm">Đ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((t) => (
            <tr key={t.teamId ?? t.rank} className="standings-row h-11">
              <td className="py-2 px-3 text-center font-bold text-slate-400">
                <span className="inline-flex items-center gap-1.5 justify-center">
                  {t.qualColor && (
                    <span
                      className="w-1 h-4 rounded-full shrink-0"
                      style={{ background: t.qualColor }}
                    />
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
              <td className="py-2 px-1 text-center text-slate-400 tabular-nums">{t.played}</td>
              <td className="py-2 px-1 text-center text-slate-300 tabular-nums">{t.wins}</td>
              <td className="py-2 px-1 text-center text-slate-300 tabular-nums">{t.draws}</td>
              <td className="py-2 px-1 text-center text-slate-300 tabular-nums">{t.losses}</td>
              <td
                className={`py-2 px-2 text-center font-bold tabular-nums ${
                  t.gd > 0 ? "text-[#62F2C0]" : t.gd < 0 ? "text-[#ff5a5a]" : "text-slate-400"
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

/** BXH một giải — tự fetch theo leagueId. Hỗ trợ cả giải chia bảng (World Cup, UCL). */
export default function LeagueTable({ league }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-11 rounded-lg bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <p className="text-xs text-slate-500 font-medium">
          Chưa có bảng xếp hạng cho giải này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.groups.map((g, i) => (
        <div
          key={i}
          className="bg-[#0B1735] border border-white/5 rounded-xl overflow-hidden shadow-xl"
        >
          <div className="px-4 py-3 border-b border-white/5 bg-slate-900/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>{g.name || data.leagueName || league.name}</span>
              {g.name && (
                <span className="text-[#334BFF] font-black">{g.name}</span>
              )}
            </h4>
          </div>
          <StandingsTable rows={g.rows} />
        </div>
      ))}
      <p className="text-[10px] text-slate-600 text-center font-medium">
        Nguồn dữ liệu: FotMob
      </p>
    </div>
  );
}
