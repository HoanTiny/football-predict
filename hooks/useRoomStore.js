"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fmt } from "@/lib/constants";
import {
  fetchRoomState,
  insertPrediction,
  addChampionPick,
  resetMyData,
  subscribeRoom,
} from "@/lib/roomApi";

const mapPrediction = (row) => ({
  id: row.id,
  matchId: String(row.match_id),
  betType: row.bet_type || "score",
  selection: row.selection || null,
  homeGoals: row.home_goals,
  awayGoals: row.away_goals,
  wager: row.wager,
  status: row.status,
  payout: row.payout,
  finalScore: row.final_score,
  placedAt: row.created_at,
  // Giờ bóng lăn đã lưu lúc đặt cược — dùng để tra lại tên đội khi match_id không còn khớp
  // (vd sau khi đổi nguồn lịch trận, xem lib/predictMatches.js).
  kickoff: row.lock_at,
});

/**
 * Chế độ chơi theo phòng: dữ liệu chung trên Supabase, realtime cho cả phòng.
 * session = { code, playerId } | null. Trả về cùng interface với useLocalStore,
 * kèm dữ liệu của cả phòng (roomPlayers, betsByMatch, championsByPlayer).
 */
export function useRoomStore(session, matches, pushToast) {
  const [players, setPlayers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const toastSeenRef = useRef(null); // id kèo đã quyết toán đã hiện toast
  const errorToastedRef = useRef(false); // để chỉ toast lỗi 1 lần

  const code = session?.code;
  const playerId = session?.playerId;

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const s = await fetchRoomState(code);
      setPlayers(s.players);
      setPredictions(s.predictions);
      setLoaded(true);
      setLoadError(null);
      errorToastedRef.current = false;
    } catch (e) {
      setLoadError(e.message || "Không tải được dữ liệu phòng");
      // chỉ báo toast 1 lần để không spam khi auth chưa sẵn sàng
      if (!errorToastedRef.current) {
        errorToastedRef.current = true;
        pushToast(`Lỗi tải dữ liệu phòng: ${e.message}`, "lose");
      }
    }
  }, [code, pushToast]);

  // Tải lần đầu + realtime + poll dự phòng 60s
  useEffect(() => {
    // Đổi phòng → reset state để guard ngoài hiển thị "đang tải" đúng
    setPlayers([]);
    setPredictions([]);
    setLoaded(false);
    setLoadError(null);
    errorToastedRef.current = false;
    if (!code) return;
    refresh();
    const unsubscribe = subscribeRoom(code, refresh);
    const t = setInterval(refresh, 60000);
    return () => {
      unsubscribe();
      clearInterval(t);
    };
  }, [code, refresh]);

  const me = useMemo(() => players.find((p) => p.id === playerId) || null, [players, playerId]);

  // Quản lý thông tin ảnh đại diện / giải đấu yêu thích cục bộ cho room mode
  const [localProfile, setLocalProfile] = useState(() => {
    if (typeof window === "undefined" || !playerId) return { avatar: null, followedLeagues: [] };
    try {
      const raw = localStorage.getItem("room_profile_" + playerId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return { avatar: null, followedLeagues: [] };
  });

  const updatePlayer = useCallback((updater) => {
    setLocalProfile((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      if (typeof window !== "undefined" && playerId) {
        localStorage.setItem("room_profile_" + playerId, JSON.stringify(next));
      }
      return next;
    });
  }, [playerId]);

  // Quy về cùng shape với chế độ solo để các component dùng chung
  const player = useMemo(() => {
    if (!me) return null;
    return {
      playerName: me.name,
      chips: me.chips,
      predictions: predictions.filter((r) => r.player_id === me.id).map(mapPrediction),
      championPicks: me.champion_picks || [],
      avatar: localProfile.avatar || null,
      followedLeagues: localProfile.followedLeagues || [],
    };
  }, [me, predictions, localProfile]);

  const placeBet = useCallback(
    async (bet) => {
      try {
        await insertPrediction(me, bet);
        await refresh();
      } catch (e) {
        pushToast(`Không đặt được kèo: ${e.message}`, "lose");
      }
    },
    [me, refresh, pushToast]
  );

  const placeChampionBet = useCallback(
    async (stage, team, wager, multiplier) => {
      try {
        await addChampionPick(me, stage, team, wager, multiplier);
        await refresh();
      } catch (e) {
        pushToast(`Không chốt được cược vô địch: ${e.message}`, "lose");
      }
    },
    [me, refresh, pushToast]
  );

  const reset = useCallback(async () => {
    try {
      await resetMyData(me);
      await refresh();
    } catch (e) {
      pushToast(`Không reset được: ${e.message}`, "lose");
    }
  }, [me, refresh, pushToast]);

  // Quyết toán do SERVER (cron) thực hiện bằng tỉ số thật → client chỉ hiện toast
  // khi kèo CỦA MÌNH vừa được quyết toán (đọc, không ghi).
  useEffect(() => {
    if (!me) return;
    const mine = predictions.filter(
      (r) => r.player_id === me.id && r.status !== "pending"
    );
    if (toastSeenRef.current === null) {
      // Lần đầu tải: ghi nhận toàn bộ, không toast (tránh spam khi mới mở)
      toastSeenRef.current = new Set(mine.map((r) => r.id));
      return;
    }
    mine.forEach((r) => {
      if (toastSeenRef.current.has(r.id)) return;
      toastSeenRef.current.add(r.id);
      const win = r.status !== "lost";
      const amt = Math.abs(r.payout || 0);
      pushToast(
        win
          ? `🎉 Thắng kèo! +${fmt(amt)} 💎 (${r.final_score || ""})`
          : `😢 Thua kèo -${fmt(amt)} 💎 (${r.final_score || ""})`,
        win ? "win" : "lose"
      );
    });
  }, [predictions, me, pushToast]);

  /* ----- dữ liệu cả phòng cho UI ----- */

  const nameById = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);

  // matchId → danh sách kèo của mọi người trong phòng
  const betsByMatch = useMemo(() => {
    const m = new Map();
    predictions.forEach((r) => {
      const matchIdStr = String(r.match_id);
      const list = m.get(matchIdStr) || [];
      list.push({ ...mapPrediction(r), playerName: nameById.get(r.player_id) || "?", isMe: r.player_id === playerId });
      m.set(matchIdStr, list);
    });
    return m;
  }, [predictions, nameById, playerId]);

  // BXH của phòng
  const leaderboard = useMemo(() => {
    return players
      .map((p) => {
        const mine = predictions.filter((r) => r.player_id === p.id);
        const settled = mine.filter((r) => r.status !== "pending");
        const wins = settled.filter((r) => r.status !== "lost").length;
        return {
          name: p.name,
          chips: p.chips,
          total: mine.length,
          winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.chips - a.chips);
  }, [players, predictions]);

  // Ai đã cược vô địch
  const champions = useMemo(
    () =>
      players
        .filter((p) => p.champion_team)
        .map((p) => {
          const teamName = p.champion_team.split(":")[0];
          return { name: p.name, team: teamName };
        }),
    [players]
  );

  // Người chơi không còn trong phòng (đã bị xoá / playerId mồ côi) — đã tải xong nhưng không tìm thấy me.
  const notMember = loaded && !loadError && !me;

  return {
    player,
    loaded,
    loadError,
    notMember,
    refresh,
    placeBet,
    placeChampionBet,
    reset,
    betsByMatch,
    leaderboard,
    champions,
    updatePlayer,
  };
}
