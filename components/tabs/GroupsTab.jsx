"use client";

import { useMemo } from "react";
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

/** TAB — Bảng đấu — lưới BXH toàn bộ 12 bảng A→L */
export default function GroupsTab({ matches, predictionByMatch }) {
  const groups = useMemo(
    () => allGroupStandings(matches, predictionByMatch, true),
    [matches, predictionByMatch]
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
          Bao gồm cả dự đoán của bạn cho các trận chưa đá
        </p>
      </div>

      {/* Grid of all 12 groups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(({ letter, standings }) => (
          <GroupCard key={letter} letter={letter} standings={standings} />
        ))}
      </div>
    </div>
  );
}
