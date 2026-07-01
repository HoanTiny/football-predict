"use client";

import { useMemo, useState, useEffect } from "react";
import { flagImgOf } from "@/lib/constants";
import { allGroupStandings } from "@/lib/bracket";

const renderFlag = (team) => {
  const imgUrl = flagImgOf(team.name);
  if (imgUrl) {
    return (
      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 bg-slate-900/50">
        <img src={imgUrl} alt={team.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 bg-slate-900/50 text-[11px] leading-none">
      {team.flag}
    </div>
  );
};

function GroupCard({ letter, standings }) {
  return (
    <div className="bg-[#0B1735] border border-white/5 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-[#334BFF] font-black">Bảng {letter}</span>
        </h4>
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
          Top 2 đi tiếp
        </span>
      </div>

      <table className="w-full text-xs text-left text-slate-300 table-fixed border-collapse">
        <colgroup>
          <col className="w-6" />
          <col />
          <col className="w-8" />
          <col className="w-7" />
          <col className="w-9" />
        </colgroup>
        <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
          <tr>
            <th className="py-1.5 px-2 text-center">#</th>
            <th className="py-1.5 px-1 text-left">Đội</th>
            <th className="py-1.5 px-1 text-center text-white" title="Điểm">Đ</th>
            <th className="py-1.5 px-1 text-center" title="Số trận">Tr</th>
            <th className="py-1.5 px-1 text-center" title="Hiệu số">HS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {standings.map((team, idx) => {
            const pos = idx + 1;
            const isQualified = pos <= 2;
            return (
              <tr
                key={team.name}
                className={`standings-row h-9 ${isQualified ? "standings-row-qualified" : ""}`}
              >
                <td className="py-1 px-2 text-center font-bold">
                  <span className={isQualified ? "text-[#62F2C0] font-black" : "text-slate-500"}>
                    {pos}
                  </span>
                </td>
                <td className="py-1 px-1 font-semibold text-white">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderFlag(team)}
                    <span className="truncate text-[11px]">{team.name}</span>
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
                <td className="py-1 px-1 text-center font-extrabold text-white tabular-nums">
                  {team.pts}
                </td>
                <td className="py-1 px-1 text-center text-slate-400 font-medium tabular-nums">
                  {team.pj}
                </td>
                <td
                  className={`py-1 px-1 text-center font-bold tabular-nums ${
                    team.dg > 0 ? "text-[#62F2C0]" : team.dg < 0 ? "text-[#ff5a5a]" : "text-slate-400"
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
  );
}

/** Bảng xếp hạng các đội HẠNG 3 — 8 đội tốt nhất giành suất Vòng 32. */
function ThirdPlaceTable({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="max-w-2xl mx-auto bg-[#0B1735] border border-white/5 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          <span className="text-[#334BFF] font-black">Hạng 3</span> xuất sắc
        </h4>
        <span className="text-[8px] text-[#62F2C0] font-bold uppercase tracking-widest">
          8 đội đi tiếp
        </span>
      </div>
      <table className="w-full text-xs text-left text-slate-300 table-fixed border-collapse">
        <colgroup>
          <col className="w-6" />
          <col />
          <col className="w-10" />
          <col className="w-8" />
          <col className="w-7" />
          <col className="w-9" />
        </colgroup>
        <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
          <tr>
            <th className="py-1.5 px-2 text-center">#</th>
            <th className="py-1.5 px-1 text-left">Đội</th>
            <th className="py-1.5 px-1 text-center">Bảng</th>
            <th className="py-1.5 px-1 text-center text-white" title="Điểm">Đ</th>
            <th className="py-1.5 px-1 text-center" title="Số trận">Tr</th>
            <th className="py-1.5 px-1 text-center" title="Hiệu số">HS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((team, idx) => {
            const pos = idx + 1;
            const qualified = pos <= 8;
            return (
              <tr
                key={team.name}
                className={`standings-row h-9 ${qualified ? "standings-row-qualified" : ""} ${
                  pos === 8 ? "border-b-2 border-[#62F2C0]/30" : ""
                }`}
              >
                <td className="py-1 px-2 text-center font-bold">
                  <span className={qualified ? "text-[#62F2C0] font-black" : "text-slate-600"}>{pos}</span>
                </td>
                <td className="py-1 px-1 font-semibold text-white">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderFlag(team)}
                    <span className={`truncate text-[11px] ${qualified ? "text-white" : "text-slate-500"}`}>
                      {team.name}
                    </span>
                    {team.live && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" title="Đang đá" />
                    )}
                  </div>
                </td>
                <td className="py-1 px-1 text-center text-[10px] font-black text-[#7b8fff]">{team.group}</td>
                <td className="py-1 px-1 text-center font-extrabold text-white tabular-nums">{team.pts}</td>
                <td className="py-1 px-1 text-center text-slate-400 font-medium tabular-nums">{team.pj}</td>
                <td
                  className={`py-1 px-1 text-center font-bold tabular-nums ${
                    team.dg > 0 ? "text-[#62F2C0]" : team.dg < 0 ? "text-[#ff5a5a]" : "text-slate-400"
                  }`}
                >
                  {team.dg > 0 ? `+${team.dg}` : team.dg}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[9px] text-slate-500 text-center border-t border-white/5">
        Xếp theo Điểm → Hiệu số → Bàn thắng · 8 đội trên vạch xanh giành vé Vòng 32
      </div>
    </div>
  );
}

/** Bảng vua phá lưới / vua kiến tạo (từ FotMob). */
function TopStatsTable({ rows, statLabel, loading, empty }) {
  if (loading) {
    return (
      <div className="text-center py-10 text-xs text-slate-500">
        Đang tải bảng xếp hạng...
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="text-center py-10 text-xs text-slate-500">
        {empty || "Chưa có dữ liệu."}
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto bg-[#0B1735] border border-white/5 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Top <span className="text-[#334BFF] font-black">{statLabel}</span>
        </h4>
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
          Nguồn: FotMob
        </span>
      </div>
      <ul className="m-0 p-0 list-none divide-y divide-white/5">
        {rows.slice(0, 20).map((p, idx) => {
          const rank = idx + 1;
          const teamFlag = flagImgOf(p.teamName);
          return (
            <li key={p.id || rank} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors">
              <span
                className={`w-5 text-center text-[11px] font-black tabular-nums ${
                  rank <= 3 ? "text-[#62F2C0]" : "text-slate-500"
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
                  className="w-7 h-7 rounded-full object-cover bg-slate-800 border border-white/10 shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-white truncate">{p.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                  {teamFlag && (
                    <img src={teamFlag} alt={p.teamName} className="w-3.5 h-3.5 rounded-full object-cover" />
                  )}
                  <span className="truncate">{p.teamName}</span>
                </div>
              </div>
              <span className="text-lg font-black text-white tabular-nums shrink-0">{p.value}</span>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-1.5 text-[9px] text-slate-500 text-center border-t border-white/5">
        Cập nhật theo lịch trận đã đá · Top 20
      </div>
    </div>
  );
}

/** TAB — Bảng đấu — lưới BXH toàn bộ 12 bảng A→L */
export default function GroupsTab({ matches, predictionByMatch }) {
  // BXH chỉ phản ánh kết quả THẬT: trận đã đá xong + trận đang đá (tỉ số realtime).
  // KHÔNG cộng dự đoán cho các trận chưa diễn ra.
  const groups = useMemo(
    () => allGroupStandings(matches, predictionByMatch, false),
    [matches, predictionByMatch]
  );

  const [view, setView] = useState("groups"); // "groups" | "third" | "scorers" | "assists"

  // Top thống kê cá nhân — fetch 1 lần cho cả 2 tab; cache server-side 30 phút.
  const [topStats, setTopStats] = useState(null); // { scorers, assists } | null
  const [topLoading, setTopLoading] = useState(false);
  useEffect(() => {
    if ((view !== "scorers" && view !== "assists") || topStats) return;
    let active = true;
    setTopLoading(true);
    fetch("/api/top-stats")
      .then((r) => r.json())
      .then((d) => active && setTopStats(d || { scorers: [], assists: [] }))
      .catch(() => active && setTopStats({ scorers: [], assists: [] }))
      .finally(() => active && setTopLoading(false));
    return () => {
      active = false;
    };
  }, [view, topStats]);

  const hasLive = useMemo(
    () => groups.some(({ standings }) => standings.some((t) => t.live)),
    [groups]
  );

  // Xếp hạng các đội đứng thứ 3 ở mỗi bảng (Điểm → Hiệu số → Bàn thắng) — 8 đội đầu đi tiếp.
  const thirdRanking = useMemo(
    () =>
      groups
        .map(({ letter, standings }) =>
          standings[2] ? { ...standings[2], group: letter } : null
        )
        .filter(Boolean)
        .sort(
          (a, b) =>
            b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name)
        ),
    [groups]
  );

  return (
    <div className="space-y-6">
      {/* Section title */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          VÒNG BẢNG
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          BẢNG XẾP HẠNG
        </h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Tính theo kết quả thật — cập nhật trực tiếp khi trận đang diễn ra
        </p>
        {hasLive && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[#E40000]/10 border border-[#E40000]/20 text-[10px] font-bold text-[#ff5a5a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse" />
            Có trận đang diễn ra · BXH đang cập nhật realtime
          </div>
        )}
      </div>

      {/* Toggle: 12 bảng / Hạng 3 / Vua phá lưới / Vua kiến tạo */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-black/25 border border-white/5">
          {[
            { key: "groups", label: "12 bảng đấu" },
            { key: "third", label: "Hạng 3 xuất sắc" },
            { key: "scorers", label: "Vua phá lưới" },
            { key: "assists", label: "Vua kiến tạo" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                view === t.key
                  ? "bg-gradient-to-b from-[#4257ff] to-[#2a3ad9] text-white shadow-lg shadow-[#334BFF]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "groups" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(({ letter, standings }) => (
            <GroupCard key={letter} letter={letter} standings={standings} />
          ))}
        </div>
      )}
      {view === "third" && <ThirdPlaceTable rows={thirdRanking} />}
      {view === "scorers" && (
        <TopStatsTable
          rows={topStats?.scorers || []}
          statLabel="ghi bàn"
          loading={topLoading}
          empty="Chưa có bàn thắng nào — giải mới bắt đầu."
        />
      )}
      {view === "assists" && (
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
