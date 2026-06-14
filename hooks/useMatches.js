"use client";

import { useState, useEffect, useCallback } from "react";
import { buildDemoMatches } from "@/lib/demoData";

/**
 * Tải danh sách trận đấu (qua proxy /api/matches) và poll mỗi 60 giây.
 * Chạy được khi: có token cá nhân (apiToken) HOẶC server đã cấu hình token
 * (hasServerToken) — khi đó client không cần dán token, route dùng env server.
 */
export function useMatches(apiToken, demoMode, hasServerToken = false) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const enabled = demoMode || !!apiToken || hasServerToken;

  const fetchMatches = useCallback(
    async (silent = false) => {
      if (demoMode) {
        setMatches(buildDemoMatches());
        setLastUpdated(new Date());
        setLoading(false);
        setError(null);
        return;
      }
      if (!apiToken && !hasServerToken) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        // Chỉ gửi token cá nhân nếu có; nếu không, route dùng FOOTBALL_DATA_TOKEN server.
        const headers = apiToken ? { "X-Auth-Token": apiToken } : undefined;
        const res = await fetch("/api/matches", { headers });
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
    [apiToken, demoMode, hasServerToken]
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
