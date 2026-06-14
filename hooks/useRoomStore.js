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
  matchId: Number(row.match_id),
  homeGoals: row.home_goals,
  awayGoals: row.away_goals,
  wager: row.wager,
  status: row.status,
  payout: row.payout,
  finalScore: row.final_score,
  placedAt: row.created_at,
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
  const toastSeenRef = useRef(null); // id kèo đã quyết toán đã hiện toast

  const code = session?.code;
  const playerId = session?.playerId;

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const s = await fetchRoomState(code);
      setPlayers(s.players);
      setPredictions(s.predictions);
      setLoaded(true);
    } catch (e) {
      pushToast(`Lỗi tải dữ liệu phòng: ${e.message}`, "lose");
    }
  }, [code, pushToast]);

  // Tải lần đầu + realtime + poll dự phòng 60s
  useEffect(() => {
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

  // Quy về cùng shape với chế độ solo để các component dùng chung
  const player = useMemo(() => {
    if (!me) return null;
    return {
      playerName: me.name,
      chips: me.chips,
      predictions: predictions.filter((r) => r.player_id === me.id).map(mapPrediction),
      championPicks: me.champion_picks || [],
    };
  }, [me, predictions]);

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
      const list = m.get(Number(r.match_id)) || [];
      list.push({ ...mapPrediction(r), playerName: nameById.get(r.player_id) || "?", isMe: r.player_id === playerId });
      m.set(Number(r.match_id), list);
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

  return { player, loaded, placeBet, placeChampionBet, reset, betsByMatch, leaderboard, champions };
}
