"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFavTeams, addFavTeam, removeFavTeam } from "@/lib/favTeams";
import { useAuthSession } from "./useAuthSession";

/**
 * Đội yêu thích của TÀI KHOẢN đang đăng nhập (chung với game Dự đoán) — đồng bộ qua Supabase,
 * xem được trên mọi thiết bị. `needsAuth: true` khi chưa đăng nhập (UI tự hiện màn đăng nhập).
 */
export function useFavTeams() {
  const { session, loading: authLoading } = useAuthSession();
  const userId = session?.user?.id || null;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!userId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchFavTeams(userId)
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  const isFav = (teamId) => teams.some((t) => String(t.id) === String(teamId));

  const toggle = async (team) => {
    if (!userId) return;
    if (isFav(team.id)) {
      setTeams((prev) => prev.filter((t) => String(t.id) !== String(team.id))); // optimistic
      await removeFavTeam(userId, team.id).catch(() => reload());
    } else {
      setTeams((prev) => [...prev, team]); // optimistic
      await addFavTeam(userId, team).catch(() => reload());
    }
  };

  const remove = async (teamId) => {
    if (!userId) return;
    setTeams((prev) => prev.filter((t) => String(t.id) !== String(teamId)));
    await removeFavTeam(userId, teamId).catch(() => reload());
  };

  return {
    teams,
    loading: authLoading || loading,
    needsAuth: !authLoading && !userId,
    isFav,
    toggle,
    remove,
  };
}
