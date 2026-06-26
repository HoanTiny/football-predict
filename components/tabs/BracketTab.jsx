"use client";

import { useMemo, useState, useEffect } from "react";
import { flagImgOf, GROUPS } from "@/lib/constants";
import { vnTime, vnDateKey } from "@/lib/time";
import { organizeBracket } from "@/lib/bracket";
import { calculateGroupStandings } from "@/lib/standings";

/**
 * Liệt kê các đội CÓ THỂ vào 1 suất theo mã FotMob (chỉ vòng 32 — mã theo bảng).
 *  "1I" = nhất bảng I · "2K" = nhì bảng K · "3ABCDF" = hạng 3 từ A/B/C/D/F.
 * Lấy từ BXH hiện tại; mã vòng sau (G3A, EF1…) không map được → trả null.
 */
function slotCandidates(code, stByGroup) {
  const m = /^([123])([A-L]+)$/.exec(code || "");
  if (!m) return null;
  const pos = Number(m[1]);
  const names = [];
  for (const g of m[2].split("")) {
    const st = stByGroup?.[g];
    const t = st && st[pos - 1];
    if (t?.name) names.push(t.name);
  }
  return names.length ? names : null;
}

const shortDate = (utcDate) => {
  if (!utcDate) return "";
  const k = vnDateKey(utcDate); // YYYY-MM-DD
  return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
};

function TeamRow({ team, score, isWinner, decided, placeholder, candidates }) {
  const name = team && team.name ? team.name : null;
  const imgUrl = name ? flagImgOf(name) : null;
  const tip =
    !name && candidates?.length
      ? `Có thể gặp: ${candidates.join(", ")}`
      : !name && placeholder
        ? placeholder
        : undefined;
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
        title={tip}
        className={`flex-1 truncate text-[10px] leading-none ${
          name
            ? "text-white font-semibold"
            : placeholder
              ? `text-[#7b8fff] font-semibold ${candidates?.length ? "underline decoration-dotted decoration-[#7b8fff]/40 cursor-help" : ""}`
              : "text-slate-500 italic font-medium"
        } ${decided && isWinner ? "text-[#62F2C0]" : ""}`}
      >
        {name || placeholder || "TBD"}
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

function BracketMatch({ match, accent, stByGroup, onBet }) {
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const finished = match?.status === "FINISHED";
  const hs = finished ? match?.score?.fullTime?.home : null;
  const as = finished ? match?.score?.fullTime?.away : null;
  const homeWins = finished && hs != null && as != null && hs > as;
  const awayWins = finished && hs != null && as != null && as > hs;

  const isClickable = !!(match && onBet);

  return (
    <div className="bk-m">
      <div
        onClick={() => isClickable && onBet(match, "stats")}
        className={`block bk-card rounded-lg overflow-hidden border bg-[#0B1735] transition-colors ${
          isClickable ? "hover:border-[#7b8fff]/60 cursor-pointer" : ""
        } ${
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
            placeholder={match?.slot?.home}
            candidates={slotCandidates(match?.code?.home, stByGroup)}
          />
          <TeamRow
            team={away}
            score={as}
            isWinner={awayWins}
            decided={finished}
            placeholder={match?.slot?.away}
            candidates={slotCandidates(match?.code?.away, stByGroup)}
          />
        </div>
      </div>
    </div>
  );
}

function RoundColumn({ matches, mods, label, stByGroup, onBet }) {
  return (
    <div className={`bk-col ${mods}`}>
      <div className="bk-col-head">{label}</div>
      <div className="bk-col-body">
        {matches.map((m, i) => (
          <BracketMatch key={m.id || i} match={m} stByGroup={stByGroup} onBet={onBet} />
        ))}
      </div>
    </div>
  );
}

/** TAB — Sơ đồ — bracket knockout 2 nhánh đối xứng */
export default function BracketTab({ matches, onBet }) {
  // Ưu tiên sơ đồ FotMob (2 biến thể: theo BXH / đã chắc chắn); fallback football-data.
  const fallback = useMemo(() => organizeBracket(matches), [matches]);
  const [fmData, setFmData] = useState(null); // { asItStands, confirmed }
  const [view, setView] = useState("stands"); // "stands" | "confirmed"
  useEffect(() => {
    let active = true;
    fetch("/api/bracket")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.hasData) setFmData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // BXH 12 bảng (kết quả thật) → liệt kê đội có thể vào mỗi suất chưa chắc chắn.
  const stByGroup = useMemo(() => {
    const out = {};
    for (const g of Object.keys(GROUPS))
      out[g] = calculateGroupStandings(matches, g, null, false);
    return out;
  }, [matches]);

  const bracket = fmData
    ? view === "confirmed"
      ? fmData.confirmed
      : fmData.asItStands
    : fallback;
  const { left, right, final, third } = bracket || {};
  const hasData = !!bracket && (fmData?.hasData || fallback.hasData);

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

      {/* Toggle: theo BXH hiện tại / chỉ đội đã chắc chắn (chỉ có khi dùng nguồn FotMob) */}
      {fmData && (
        <div className="flex justify-center">
          <div className="inline-flex gap-1 p-1 rounded-full bg-black/25 border border-white/5">
            {[
              { key: "stands", label: "Theo BXH hiện tại" },
              { key: "confirmed", label: "Đã chắc chắn" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
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
      )}

      <div className="bk-wrap">
        <div className="bk">
          {/* LEFT BRANCH */}
          <div className="bk-side">
            <RoundColumn
              matches={left.r32}
              mods="bk-out-right"
              label="Vòng 32"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={left.r16}
              mods="bk-in-left bk-out-right"
              label="Vòng 16"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={left.qf}
              mods="bk-in-left bk-out-right"
              label="Tứ kết"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={left.sf}
              mods="bk-in-left bk-out-right"
              label="Bán kết"
              stByGroup={stByGroup}
              onBet={onBet}
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
              <BracketMatch match={final} accent stByGroup={stByGroup} onBet={onBet} />
            </div>
            {third && (
              <div className="bk-third">
                <div className="bk-col-head text-[#FFA07A]">Tranh hạng 3</div>
                <BracketMatch match={third} stByGroup={stByGroup} onBet={onBet} />
              </div>
            )}
          </div>

          {/* RIGHT BRANCH */}
          <div className="bk-side">
            <RoundColumn
              matches={right.sf}
              mods="bk-in-right bk-out-left"
              label="Bán kết"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={right.qf}
              mods="bk-in-right bk-out-left"
              label="Tứ kết"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={right.r16}
              mods="bk-in-right bk-out-left"
              label="Vòng 16"
              stByGroup={stByGroup}
              onBet={onBet}
            />
            <RoundColumn
              matches={right.r32}
              mods="bk-out-left"
              label="Vòng 32"
              stByGroup={stByGroup}
              onBet={onBet}
            />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-600">
        {fmData ? (
          view === "confirmed" ? (
            <>
              Chỉ hiện đội{" "}
              <span className="text-slate-400 font-semibold">đã chắc chắn</span>
              ; ô còn lại là mã suất — di chuột để xem{" "}
              <span className="text-[#7b8fff]">đội có thể gặp</span>
            </>
          ) : (
            <>
              Đội ở các vòng là{" "}
              <span className="text-slate-400 font-semibold">
                tạm tính theo BXH hiện tại
              </span>{" "}
              (FotMob) — chuyển tab{" "}
              <span className="text-[#7b8fff]">Đã chắc chắn</span> để xem suất
              chính thức
            </>
          )
        ) : (
          <>
            Cuộn ngang để xem toàn bộ sơ đồ · Nhãn{" "}
            <span className="text-[#7b8fff] font-semibold">xanh</span> = suất
            theo bảng (vd <span className="text-[#7b8fff]">Nhất E</span>,{" "}
            <span className="text-[#7b8fff]">Nhì C</span>) · Đội đi tiếp tự cập
            nhật khi có kết quả
          </>
        )}
      </p>
    </div>
  );
}
