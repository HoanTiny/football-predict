"use client";

import { useState } from "react";
import { leagueLogo } from "@/lib/leagues";
import LeagueMatches from "./LeagueMatches";
import LeagueTable from "./LeagueTable";
import MatchDetailSheet from "./MatchDetailSheet";

const LeagueLogoImg = ({ league }) => {
  const [err, setErr] = useState(false);
  if (err) return <span className="text-sm shrink-0">🏆</span>;
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
 * Nội dung 1 giải đấu (Lịch & KQ / BXH) — dùng trong AppShell kiểu Apple Sports,
 * nơi việc CHỌN giải nằm ở dropdown góc phải header (không còn hàng chip ở đây).
 */
export default function LeagueView({ league }) {
  const [subTab, setSubTab] = useState("matches"); // "matches" | "table"
  const [selected, setSelected] = useState(null); // trận đang mở chi tiết

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Tiêu đề giải + chuyển Lịch / BXH */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-white truncate flex items-center gap-2">
          <LeagueLogoImg league={league} />
          {league.name}
        </h2>
        <div className="flex bg-white/10 border border-white/20 backdrop-blur-xl p-1 rounded-full gap-0.5 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
          {[
            { key: "matches", label: "Lịch & KQ" },
            { key: "table", label: "BXH" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                subTab === t.key ? "bg-white/25 text-white" : "text-white/60 hover:text-white"
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
      {selected && <MatchDetailSheet match={selected} leagueId={league.id} onClose={() => setSelected(null)} />}
    </div>
  );
}
