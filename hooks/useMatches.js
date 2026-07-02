"use client";

import { useState, useEffect, useCallback } from "react";
import { buildDemoMatches } from "@/lib/demoData";

/**
 * Tải danh sách trận đấu của 1 giải (qua proxy /api/matches?leagueId=, nguồn FotMob — không
 * cần API key) và poll mỗi 60 giây.
 */
export function useMatches(leagueId, demoMode) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const enabled = demoMode || !!leagueId;

  const fetchMatches = useCallback(
    async (silent = false) => {
      if (demoMode) {
        setMatches(buildDemoMatches());
        setLastUpdated(new Date());
        setLoading(false);
        setError(null);
        return;
      }
      if (!leagueId) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`/api/matches?leagueId=${leagueId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setMatches(data.matches || []);
        setLastUpdated(new Date());
        setError(null);
      } catch (e) {
        if (!silent) setError(e.message || "fetch failed");
      } finally {
        setLoading(false);
      }
    },
    [leagueId, demoMode]
  );

  useEffect(() => {
    if (enabled) fetchMatches();
  }, [fetchMatches, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => fetchMatches(true), 60000);
    return () => clearInterval(t);
  }, [fetchMatches, enabled]);

  // Refetch ngay khi người dùng quay lại app (mobile tạm dừng timer khi ở nền).
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMatches(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [fetchMatches, enabled]);

  return { matches, loading, error, lastUpdated, fetchMatches };
}
