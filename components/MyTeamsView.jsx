"use client";

import { useEffect, useMemo, useState } from "react";
import { teamLogo } from "@/lib/leagues";
import { vnDateKey, vnDateHeader } from "@/lib/time";
import { useFavTeams } from "@/hooks/useFavTeams";
import AuthModal from "./AuthModal";
import MatchRow from "./leagues/MatchRow";
import MatchDetailSheet from "./leagues/MatchDetailSheet";

const VIEW_TABS = [
  { key: "yesterday", label: "Hôm qua" },
  { key: "today", label: "Hôm nay" },
  { key: "upcoming", label: "Sắp tới" },
];

/** Lịch + kết quả GỘP của mọi đội yêu thích (đồng bộ theo tài khoản) — mở "Đội của tôi" là
 * thấy lịch luôn, không cần bấm chọn từng đội. Hàng crest phía trên để quản lý (bỏ theo dõi). */
export default function MyTeamsView({ onClose }) {
  const { teams, loading: teamsLoading, needsAuth, remove } = useFavTeams();
  const [authOpen, setAuthOpen] = useState(false);
  const [byLeague, setByLeague] = useState({}); // leagueId -> matches[]
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState("today");

  const leagueIds = useMemo(() => [...new Set(teams.map((t) => t.leagueId))], [teams]);

  useEffect(() => {
    if (leagueIds.length === 0) {
      setByLeague({});
      setLoadingMatches(false);
      return;
    }
    let alive = true;
    setLoadingMatches(true);
    Promise.all(
      leagueIds.map((id) =>
        fetch(`/api/leagues/fixtures?id=${id}`)
          .then((r) => r.json())
          .then((j) => [id, j.matches || []])
          .catch(() => [id, []])
      )
    ).then((entries) => {
      if (!alive) return;
      setByLeague(Object.fromEntries(entries));
      setLoadingMatches(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueIds.join(",")]);

  const teamIds = useMemo(() => new Set(teams.map((t) => String(t.id))), [teams]);

  const allMatches = useMemo(
    () =>
      Object.entries(byLeague).flatMap(([leagueId, matches]) =>
        matches
          .filter((m) => teamIds.has(String(m.home.id)) || teamIds.has(String(m.away.id)))
          .map((m) => ({ ...m, _leagueId: Number(leagueId) }))
      ),
    [byLeague, teamIds]
  );

  const todayKeyStr = useMemo(() => vnDateKey(new Date().toISOString()), []);
  const yesterdayKeyStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return vnDateKey(y.toISOString());
  }, []);

  // Tab nhanh: lọc trực tiếp trên danh sách đã tải (không gọi API thêm).
  const quickFiltered = useMemo(() => {
    if (view === "yesterday") {
      return allMatches
        .filter((m) => vnDateKey(m.utcTime) === yesterdayKeyStr)
        .sort((a, b) => new Date(b.utcTime) - new Date(a.utcTime));
    }
    if (view === "today") {
      return allMatches
        .filter((m) => vnDateKey(m.utcTime) === todayKeyStr)
        .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    }
    return allMatches
      .filter((m) => new Date(m.utcTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
  }, [allMatches, view, todayKeyStr, yesterdayKeyStr]);

  // "Xem toàn bộ": kết quả MỚI NHẤT lên đầu; trận CHƯA đá xếp gần nhất trước, nối phía dưới.
  const fullOrdered = useMemo(() => {
    const now = Date.now();
    const past = allMatches
      .filter((m) => new Date(m.utcTime).getTime() <= now)
      .sort((a, b) => new Date(b.utcTime) - new Date(a.utcTime));
    const future = allMatches
      .filter((m) => new Date(m.utcTime).getTime() > now)
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    return [...past, ...future];
  }, [allMatches]);

  const ordered = showAll ? fullOrdered : quickFiltered;

  const byDate = useMemo(() => {
    const groups = [];
    let lastKey = null;
    for (const m of ordered) {
      const key = vnDateKey(m.utcTime);
      if (key !== lastKey) {
        groups.push({ key, header: vnDateHeader(m.utcTime), items: [] });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [ordered]);

  const emptyQuickMsg = {
    yesterday: "Không có trận nào của các đội theo dõi hôm qua.",
    today: "Không có trận nào của các đội theo dõi hôm nay.",
    upcoming: "Chưa có lịch sắp tới của các đội theo dõi.",
  }[view];

  const loading = teamsLoading || (teams.length > 0 && loadingMatches);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
        >
          ‹
        </button>
        <h2 className="text-sm font-black text-white">★ Đội của tôi</h2>
      </div>

      {needsAuth ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🔒</div>
          <p className="text-xs text-white/50 font-medium max-w-xs mx-auto leading-relaxed mb-4">
            Đăng nhập để lưu đội yêu thích và đồng bộ trên mọi thiết bị (chung tài khoản với game Dự đoán).
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white"
          >
            Đăng nhập / Đăng ký
          </button>
        </div>
      ) : !teamsLoading && teams.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">⭐</div>
          <p className="text-xs text-white/50 font-medium max-w-xs mx-auto leading-relaxed">
            Chưa có đội yêu thích nào. Mở chi tiết một trận đấu và bấm ☆ cạnh tên đội để thêm.
          </p>
        </div>
      ) : (
        <>
          {/* Hàng crest các đội đang theo dõi — bấm ✕ để bỏ theo dõi ngay */}
          {teams.length > 0 && (
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-thin pb-1">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="shrink-0 flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl"
                >
                  <img src={teamLogo(t.id)} alt={t.name} className="w-5 h-5 object-contain" />
                  <span className="text-[11px] font-bold text-white whitespace-nowrap">{t.name}</span>
                  <button
                    onClick={() => remove(t.id)}
                    title="Bỏ theo dõi"
                    className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showAll && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                {VIEW_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setView(t.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      view === t.key ? "bg-white/25 text-white" : "text-white/60 hover:text-white/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!loading && allMatches.length > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-2 rounded-full text-[11px] font-bold text-white/60 bg-white/10 border border-white/15 backdrop-blur-xl hover:text-white hover:bg-white/15 transition-all"
            >
              {showAll ? "↓ Thu gọn (Hôm qua / Hôm nay / Sắp tới)" : `↑ Xem toàn bộ (${allMatches.length} trận)`}
            </button>
          )}

          {loading ? (
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-[68px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : byDate.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 opacity-30">📅</div>
              <p className="text-xs text-white/50 font-medium">
                {showAll ? "Chưa có lịch thi đấu cho các đội đang theo dõi." : emptyQuickMsg}
              </p>
            </div>
          ) : (
            byDate.map((g) => (
              <div key={g.key} className="space-y-2.5">
                <div className="flex items-center gap-2.5 pt-1">
                  <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest shrink-0">
                    {g.header}
                  </h3>
                  <span className="h-px flex-grow bg-white/10 rounded-full" />
                </div>
                <div className="space-y-2">
                  {g.items.map((m) => (
                    <MatchRow key={m.id} m={m} onSelect={() => setSelected(m)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {selected && (
        <MatchDetailSheet match={selected} leagueId={selected._leagueId} onClose={() => setSelected(null)} />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
