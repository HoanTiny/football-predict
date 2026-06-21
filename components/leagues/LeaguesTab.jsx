"use client";

import { useState } from "react";
import { LEAGUES, leagueById, leagueLogo, DEFAULT_LEAGUE_ID } from "@/lib/leagues";
import LeagueMatches from "./LeagueMatches";
import LeagueTable from "./LeagueTable";
import MatchDetailSheet from "./MatchDetailSheet";
import FollowButton from "../FollowButton";

const LeagueChipLogo = ({ league }) => {
  const [err, setErr] = useState(false);
  if (err) {
    return <span className="text-sm shrink-0">🏆</span>;
  }
  return (
    <img
      src={leagueLogo(league.id)}
      alt={league.name}
      onError={() => setErr(true)}
      className="w-5 h-5 object-contain shrink-0"
    />
  );
};

/**
 * Trình duyệt đa giải kiểu Apple Sports: chọn giải → xem Lịch/Kết quả hoặc BXH,
 * bấm vào trận để mở chi tiết (đội hình, thống kê, phong độ, đối đầu). Nguồn: FotMob.
 */
export default function LeaguesTab() {
  const [leagueId, setLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [subTab, setSubTab] = useState("matches"); // "matches" | "table"
  const [selected, setSelected] = useState(null); // trận đang mở chi tiết

  const league = leagueById(leagueId) || LEAGUES[0];

  return (
    <div className="space-y-4">
      {/* Bộ chọn giải đấu — hàng chip cuộn ngang */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
        {LEAGUES.map((l) => {
          const active = String(l.id) === String(leagueId);
          return (
            <button
              key={l.id}
              onClick={() => setLeagueId(l.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                active
                  ? "bg-[#334BFF] text-white border-[#334BFF] shadow-[0_4px_12px_rgba(51,75,255,0.25)]"
                  : "bg-slate-800/40 text-slate-300 border-white/5 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LeagueChipLogo league={l} />
              <span className="whitespace-nowrap">{l.short}</span>
            </button>
          );
        })}
      </div>

      {/* Tiêu đề giải + chuyển Lịch / BXH */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-white truncate flex items-center gap-2 min-w-0">
          <LeagueChipLogo league={league} />
          <span className="truncate">{league.name}</span>
          <FollowButton kind="league" id={league.id} name={league.name} size="sm" />
        </h2>
        <div className="flex bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg gap-0.5 shrink-0">
          {[
            { key: "matches", label: "Lịch & KQ" },
            { key: "table", label: "BXH" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                subTab === t.key ? "bg-[#334BFF] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nội dung — key theo giải để remount khi đổi giải */}
      {subTab === "matches" ? (
        <LeagueMatches key={`m-${league.id}`} league={league} onSelect={setSelected} />
      ) : (
        <LeagueTable key={`t-${league.id}`} league={league} />
      )}

      {/* Modal chi tiết trận */}
      {selected && <MatchDetailSheet match={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
