"use client";

import { useEffect, useMemo, useState } from "react";
import { useFollows } from "@/lib/follows";
import { LEAGUES, leagueById, leagueLogo, teamLogo } from "@/lib/leagues";
import { vnDateKey, vnTime, pad } from "@/lib/time";
import MatchDetailSheet from "../leagues/MatchDetailSheet";
import FollowButton from "../FollowButton";

const utcKey = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

// Logo nhỏ (đội/giải) có fallback chữ.
const Logo = ({ url, name, size = "w-6 h-6" }) => {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className={`${size} rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0`}>
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setErr(true)} className={`${size} object-contain shrink-0`} />;
};

function MatchRow({ m, onSelect }) {
  const isLive = m.started && !m.finished && !m.cancelled;
  const status = m.cancelled
    ? "Hoãn"
    : isLive
      ? (m.liveTime || "LIVE")
      : m.finished
        ? (m.statusShort || "FT")
        : vnTime(m.utcTime);
  return (
    <button
      onClick={() => onSelect(m)}
      className={`w-full text-left rounded-xl border bg-[#0B1735] px-3 py-2.5 flex items-center gap-3 transition-all hover:bg-white/[0.03] active:scale-[0.99] ${
        isLive ? "border-[#ff5a5a]/30" : "border-white/5 hover:border-white/10"
      }`}
    >
      <div className={`w-12 shrink-0 text-center text-[10px] font-bold tabular-nums ${isLive ? "text-[#ff5a5a]" : "text-slate-400"}`}>
        {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse mr-1 align-middle" />}
        {status}
      </div>
      <div className="w-px self-stretch bg-white/5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        {[m.home, m.away].map((t, i) => {
          const sc = i === 0 ? m.home.score : m.away.score;
          const win = m.finished && ((i === 0 && m.home.score > m.away.score) || (i === 1 && m.away.score > m.home.score));
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Logo url={teamLogo(t.id)} name={t.name} />
                <span className={`text-sm font-bold truncate ${win ? "text-white" : "text-slate-200"}`}>{t.name}</span>
              </div>
              {sc != null && <span className={`text-sm font-black tabular-nums shrink-0 ${win ? "text-white" : "text-slate-400"}`}>{sc}</span>}
            </div>
          );
        })}
      </div>
      <span className="text-slate-600 text-xs shrink-0">›</span>
    </button>
  );
}

const DAY_LABELS = { "-1": "Hôm qua", "0": "Hôm nay", "1": "Ngày mai" };

/** Trang chủ "For You" — trận của giải & đội đang theo dõi, live lên đầu. */
export default function ForYouTab() {
  const f = useFollows();
  const hasFollows = f.leagues.length > 0 || f.teams.length > 0;
  const [offset, setOffset] = useState(0);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  // Ngày VN đang chọn + 2 khoá ngày UTC phủ trọn ngày VN (VN = UTC+7 nên 1 ngày VN nằm ở 2 bucket UTC).
  const { vnDay, utcKeys } = useMemo(() => {
    const vnNow = new Date(Date.now() + 7 * 3600000 + offset * 86400000);
    const vy = vnNow.getUTCFullYear(), vm = vnNow.getUTCMonth(), vd = vnNow.getUTCDate();
    const vnMidnightUTC = new Date(Date.UTC(vy, vm, vd) - 7 * 3600000); // 00:00 VN theo UTC
    const vnEndUTC = new Date(vnMidnightUTC.getTime() + 24 * 3600000 - 1000);
    const keys = [...new Set([utcKey(vnMidnightUTC), utcKey(vnEndUTC)])];
    return { vnDay: `${vy}-${pad(vm + 1)}-${pad(vd)}`, utcKeys: keys };
  }, [offset]);

  const followedLeagueSet = useMemo(() => new Set(f.leagues.map(String)), [f.leagues]);
  const followedTeamSet = useMemo(() => new Set(f.teams.map((t) => String(t.id))), [f.teams]);
  // key ổn định để useEffect không chạy lại vô ích
  const followKey = [...followedLeagueSet].sort().join(",") + "|" + [...followedTeamSet].sort().join(",");

  useEffect(() => {
    if (!hasFollows) { setMatches([]); return; }
    let active = true;
    setLoading(true);
    const load = () => {
      // Có theo dõi đội → phải lấy mọi giải rồi lọc; chỉ theo dõi giải → lọc sẵn cho nhẹ.
      const leaguesParam = followedTeamSet.size ? "" : `&leagues=${[...followedLeagueSet].join(",")}`;
      Promise.all(
        utcKeys.map((k) =>
          fetch(`/api/sports/matches?date=${k}${leaguesParam}`).then((r) => r.json()).catch(() => ({ matches: [] }))
        )
      ).then((results) => {
        if (!active) return;
        const seen = new Set();
        const merged = [];
        for (const res of results) {
          for (const m of res.matches || []) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            // Đúng ngày VN đang chọn + thuộc giải/đội theo dõi.
            if (vnDateKey(m.utcTime) !== vnDay) continue;
            const inLeague = followedLeagueSet.has(String(m.leagueId));
            const inTeam = followedTeamSet.has(String(m.home?.id)) || followedTeamSet.has(String(m.away?.id));
            if (inLeague || inTeam) merged.push(m);
          }
        }
        merged.sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
        setMatches(merged);
        setLoading(false);
      });
    };
    load();
    const timer = setInterval(load, 30000); // tươi cho trận live
    return () => { active = false; clearInterval(timer); };
  }, [followKey, utcKeys.join(","), vnDay, hasFollows]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const live = matches.filter((m) => m.started && !m.finished && !m.cancelled);
    const upcoming = matches.filter((m) => !m.started && !m.cancelled);
    const done = matches.filter((m) => m.finished || m.cancelled);
    return [
      { key: "live", title: "🔴 Đang diễn ra", items: live },
      { key: "up", title: offset === 0 ? "Sắp diễn ra" : "Lịch thi đấu", items: upcoming },
      { key: "done", title: "Kết quả", items: done },
    ].filter((g) => g.items.length);
  }, [matches, offset]);

  return (
    <div className="space-y-4">
      {/* Đang theo dõi — quản lý nhanh (✕ để bỏ) */}
      {hasFollows && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Đang theo dõi</span>
          {f.leagues.map((id) => {
            const lg = leagueById(id);
            return (
              <span key={`l${id}`} className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-white/10 rounded-lg pl-1.5 pr-1 py-1">
                <Logo url={leagueLogo(id)} name={lg?.short || id} size="w-4 h-4" />
                <span className="text-[11px] font-bold text-slate-200">{lg?.short || `#${id}`}</span>
                <button onClick={() => f.toggleLeague(id)} title="Bỏ theo dõi" className="text-slate-500 hover:text-[#ff5a5a] text-xs leading-none px-0.5">✕</button>
              </span>
            );
          })}
          {f.teams.map((t) => (
            <span key={`t${t.id}`} className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-white/10 rounded-lg pl-1.5 pr-1 py-1">
              <Logo url={teamLogo(t.id)} name={t.name} size="w-4 h-4" />
              <span className="text-[11px] font-bold text-slate-200 max-w-[120px] truncate">{t.name}</span>
              <button onClick={() => f.toggleTeam(t)} title="Bỏ theo dõi" className="text-slate-500 hover:text-[#ff5a5a] text-xs leading-none px-0.5">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Bộ chọn ngày */}
      <div className="flex gap-2">
        {["-1", "0", "1"].map((o) => (
          <button
            key={o}
            onClick={() => setOffset(Number(o))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              offset === Number(o) ? "bg-[#334BFF] text-white" : "bg-slate-800/40 text-slate-400 border border-white/5 hover:text-white"
            }`}
          >
            {DAY_LABELS[o]}
          </button>
        ))}
      </div>

      {!hasFollows ? (
        <div className="rounded-2xl border border-white/5 bg-[#0B1735]/60 p-6 text-center space-y-4">
          <div className="text-4xl opacity-40">⭐</div>
          <div>
            <div className="text-sm font-bold text-white mb-1">Theo dõi giải để xem ở đây</div>
            <div className="text-xs text-slate-500">Chọn vài giải bên dưới — trận của chúng sẽ hiện ở Trang chủ.</div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {LEAGUES.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 bg-slate-800/40 border border-white/5 rounded-xl pl-2 pr-1 py-1">
                <Logo url={leagueLogo(l.id)} name={l.short} size="w-4 h-4" />
                <span className="text-[11px] font-bold text-slate-200">{l.short}</span>
                <FollowButton kind="league" id={l.id} name={l.name} size="sm" />
              </div>
            ))}
          </div>
        </div>
      ) : loading && matches.length === 0 ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[68px] rounded-xl bg-slate-800/30 animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-xs text-slate-500 font-medium">Không có trận nào của giải/đội bạn theo dõi {DAY_LABELS[String(offset)].toLowerCase()}.</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="space-y-2.5">
            <div className="flex items-center gap-2.5 pt-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{g.title}</h3>
              <span className="h-px flex-grow bg-white/5 rounded-full" />
            </div>
            <div className="space-y-2">
              {g.items.map((m) => <MatchRow key={m.id} m={m} onSelect={setSelected} />)}
            </div>
          </div>
        ))
      )}

      {selected && <MatchDetailSheet match={selected} onClose={() => setSelected(null)} />}
      <p className="text-[10px] text-slate-600 text-center font-medium">Nguồn dữ liệu: FotMob</p>
    </div>
  );
}
