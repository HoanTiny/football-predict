"use client";

import { useMemo } from "react";
import { flagImgOf } from "@/lib/constants";
import { vnTime, vnDateKey } from "@/lib/time";
import { organizeBracket } from "@/lib/bracket";

const shortDate = (utcDate) => {
  if (!utcDate) return "";
  const k = vnDateKey(utcDate); // YYYY-MM-DD
  return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
};

function TeamRow({ team, score, isWinner, decided }) {
  const name = team && team.name ? team.name : null;
  const imgUrl = name ? flagImgOf(name) : null;
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 ${
        decided && isWinner ? "bg-[#334BFF]/15" : ""
      }`}
    >
      <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 bg-slate-900/60">
        {imgUrl ? (
          <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[8px] text-slate-500">?</span>
        )}
      </div>
      <span
        className={`flex-1 truncate text-[10px] leading-none ${
          name
            ? "text-white font-semibold"
            : "text-slate-500 italic font-medium"
        } ${decided && isWinner ? "text-[#62F2C0]" : ""}`}
      >
        {name || "TBD"}
      </span>
      <span
        className={`shrink-0 w-4 text-center text-[10px] font-bold tabular-nums ${
          score != null ? "text-white" : "text-slate-600"
        }`}
      >
        {score != null ? score : "–"}
      </span>
    </div>
  );
}

function BracketMatch({ match, accent }) {
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const finished = match?.status === "FINISHED";
  const hs = finished ? match?.score?.fullTime?.home : null;
  const as = finished ? match?.score?.fullTime?.away : null;
  const homeWins = finished && hs != null && as != null && hs > as;
  const awayWins = finished && hs != null && as != null && as > hs;

  return (
    <div className="bk-m">
      <div
        className={`bk-card rounded-lg overflow-hidden border bg-[#0B1735] ${
          accent
            ? "border-[#F5C518]/40 shadow-[0_0_14px_rgba(245,197,24,0.15)]"
            : "border-white/10"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-0.5 bg-slate-900/40 border-b border-white/5">
          <span className="text-[8px] font-bold text-slate-500 tabular-nums">
            {match ? shortDate(match.utcDate) : "—"}
          </span>
          <span className="text-[8px] font-bold text-slate-500 tabular-nums">
            {match ? vnTime(match.utcDate) : ""}
          </span>
        </div>
        <div className="divide-y divide-white/5">
          <TeamRow
            team={home}
            score={hs}
            isWinner={homeWins}
            decided={finished}
          />
          <TeamRow
            team={away}
            score={as}
            isWinner={awayWins}
            decided={finished}
          />
        </div>
      </div>
    </div>
  );
}

function RoundColumn({ matches, mods, label }) {
  return (
    <div className={`bk-col ${mods}`}>
      <div className="bk-col-head">{label}</div>
      <div className="bk-col-body">
        {matches.map((m, i) => (
          <BracketMatch key={m.id || i} match={m} />
        ))}
      </div>
    </div>
  );
}

/** TAB — Sơ đồ — bracket knockout 2 nhánh đối xứng */
export default function BracketTab({ matches }) {
  const bracket = useMemo(() => organizeBracket(matches), [matches]);
  const { left, right, final, third, hasData } = bracket;

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🗺️</div>
        <p className="text-xs text-slate-500 font-medium">
          Chưa có dữ liệu vòng knockout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section title */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          FIFA WORLD CUP 2026
        </div>
        <h2 className="text-2xl font-bold text-[#F5C518] uppercase tracking-wider">
          SƠ ĐỒ KNOCKOUT
        </h2>
      </div>

      <div className="bk-wrap">
        <div className="bk">
          {/* LEFT BRANCH */}
          <div className="bk-side">
            <RoundColumn
              matches={left.r32}
              mods="bk-out-right"
              label="Vòng 32"
            />
            <RoundColumn
              matches={left.r16}
              mods="bk-in-left bk-out-right"
              label="Vòng 16"
            />
            <RoundColumn
              matches={left.qf}
              mods="bk-in-left bk-out-right"
              label="Tứ kết"
            />
            <RoundColumn
              matches={left.sf}
              mods="bk-in-left bk-out-right"
              label="Bán kết"
            />
          </div>

          {/* CENTER */}
          <div className="bk-center">
            <div className="bk-col-head text-[#F5C518]">Chung kết</div>
            <div className="bk-final">
              <img
                src="/wc2026-emblem.png"
                alt="FIFA World Cup 2026"
                className="bk-emblem"
              />
              <BracketMatch match={final} accent />
            </div>
            {third && (
              <div className="bk-third">
                <div className="bk-col-head text-[#FFA07A]">Tranh hạng 3</div>
                <BracketMatch match={third} />
              </div>
            )}
          </div>

          {/* RIGHT BRANCH */}
          <div className="bk-side">
            <RoundColumn
              matches={right.sf}
              mods="bk-in-right bk-out-left"
              label="Bán kết"
            />
            <RoundColumn
              matches={right.qf}
              mods="bk-in-right bk-out-left"
              label="Tứ kết"
            />
            <RoundColumn
              matches={right.r16}
              mods="bk-in-right bk-out-left"
              label="Vòng 16"
            />
            <RoundColumn
              matches={right.r32}
              mods="bk-out-left"
              label="Vòng 32"
            />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-600">
        Cuộn ngang để xem toàn bộ sơ đồ · Đội đi tiếp sẽ tự cập nhật khi có kết
        quả
      </p>
    </div>
  );
}
