"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LS_ACTIVE, START_CHIPS, fmt } from "@/lib/constants";
import { loadPlayer, savePlayer } from "@/lib/storage";
import { computeSettlement } from "@/lib/settlement";

/**
 * Chế độ chơi một mình: hồ sơ lưu localStorage trên trình duyệt này.
 * Trả về cùng interface với useRoomStore.
 */
export function useLocalStore(matches, pushToast) {
  const [player, setPlayer] = useState(() => {
    const n = localStorage.getItem(LS_ACTIVE);
    return n ? loadPlayer(n) : null;
  });
  const settledRef = useRef(new Set());

  const updatePlayer = useCallback((updater) => {
    setPlayer((prev) => {
      if (!prev) return prev;
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      savePlayer(next);
      return next;
    });
  }, []);

  const createPlayer = useCallback(
    (name) => {
      const existing = loadPlayer(name);
      const p = existing || { playerName: name, chips: START_CHIPS, predictions: [], championPick: null };
      savePlayer(p);
      localStorage.setItem(LS_ACTIVE, name);
      setPlayer(p);
      if (!existing) pushToast(`Chào ${name}! Bạn nhận ${fmt(START_CHIPS)} 💎 để bắt đầu 🎉`, "win");
    },
    [pushToast]
  );

  const placeBet = useCallback(
    (bet) => {
      updatePlayer((prev) => ({
        ...prev,
        chips: prev.chips - bet.wager,
        predictions: [...prev.predictions, { ...bet, status: "pending", payout: 0, placedAt: new Date().toISOString() }],
      }));
    },
    [updatePlayer]
  );

  const placeChampionBet = useCallback(
    (team, wager) => {
      updatePlayer((prev) => ({
        ...prev,
        chips: prev.chips - wager,
        championPick: { team, wager, status: "pending", payout: 0 },
      }));
    },
    [updatePlayer]
  );

  const reset = useCallback(() => {
    settledRef.current = new Set();
    updatePlayer((prev) => ({ ...prev, chips: START_CHIPS, predictions: [], championPick: null }));
  }, [updatePlayer]);

  // Tự quyết toán khi có trận FINISHED
  useEffect(() => {
    const result = computeSettlement(matches, player, settledRef.current);
    if (!result) return;
    result.settledMatchIds.forEach((id) => settledRef.current.add(id));
    updatePlayer((prev) => ({
      ...prev,
      predictions: result.predictions,
      championPick: result.championPick,
      chips: prev.chips + result.chipsGain,
    }));
    result.toasts.forEach((t) => pushToast(t.msg, t.type));
  }, [matches, player, updatePlayer, pushToast]);

  return { player, createPlayer, placeBet, placeChampionBet, reset };
}
