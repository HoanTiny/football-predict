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
    if (!n) return null;
    const p = loadPlayer(n);
    if (!p) return null;
    // Migrate cũ: championPick đơn → championPicks[]
    if (p.championPick !== undefined && !p.championPicks) {
      const migrated = {
        ...p,
        championPicks: p.championPick
          ? [{ ...p.championPick, stage: "GROUP_STAGE", multiplier: 5 }]
          : [],
      };
      delete migrated.championPick;
      savePlayer(migrated);
      return migrated;
    }
    return p;
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
      let p;
      if (existing) {
        // Migrate nếu cần
        if (existing.championPick !== undefined && !existing.championPicks) {
          p = {
            ...existing,
            championPicks: existing.championPick
              ? [{ ...existing.championPick, stage: "GROUP_STAGE", multiplier: 5 }]
              : [],
          };
          delete p.championPick;
        } else {
          p = existing;
        }
      } else {
        p = { playerName: name, chips: START_CHIPS, predictions: [], championPicks: [] };
      }
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
        predictions: [
          ...prev.predictions,
          {
            id: Math.random().toString(36).substring(2, 11),
            ...bet,
            status: "pending",
            payout: 0,
            placedAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [updatePlayer]
  );

  const placeChampionBet = useCallback(
    (stage, team, wager, multiplier) => {
      updatePlayer((prev) => ({
        ...prev,
        chips: prev.chips - wager,
        championPicks: [
          ...(prev.championPicks || []),
          {
            id: Math.random().toString(36).substring(2, 11),
            stage,
            team,
            wager,
            multiplier,
            status: "pending",
            payout: 0,
            placedAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [updatePlayer]
  );

  const reset = useCallback(() => {
    settledRef.current = new Set();
    updatePlayer((prev) => ({ ...prev, chips: START_CHIPS, predictions: [], championPicks: [] }));
  }, [updatePlayer]);

  // Tự quyết toán khi có trận FINISHED
  useEffect(() => {
    const result = computeSettlement(matches, player, settledRef.current);
    if (!result) return;
    result.settledMatchIds.forEach((id) => settledRef.current.add(id));
    updatePlayer((prev) => ({
      ...prev,
      predictions: result.predictions,
      championPicks: result.championPicks,
      chips: prev.chips + result.chipsGain,
    }));
    result.toasts.forEach((t) => pushToast(t.msg, t.type));
  }, [matches, player, updatePlayer, pushToast]);

  return { player, createPlayer, placeBet, placeChampionBet, reset, updatePlayer };
}
