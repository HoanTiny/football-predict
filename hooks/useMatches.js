"use client";

import { useState, useEffect, useCallback } from "react";
import { buildDemoMatches } from "@/lib/demoData";

/**
 * Tải danh sách trận đấu (qua proxy /api/matches) và poll mỗi 60 giây
 * để cập nhật tỉ số LIVE / bắt trận chuyển sang FINISHED.
 */
export function useMatches(apiToken, demoMode) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMatches = useCallback(
    async (silent = false) => {
      if (demoMode) {
        setMatches(buildDemoMatches());
        setLastUpdated(new Date());
        setLoading(false);
        setError(null);
        return;
      }
      if (!apiToken) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/matches", { headers: { "X-Auth-Token": apiToken } });
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
    [apiToken, demoMode]
  );

  useEffect(() => {
    if (apiToken || demoMode) fetchMatches();
  }, [fetchMatches, apiToken, demoMode]);

  useEffect(() => {
    if (!apiToken && !demoMode) return;
    const t = setInterval(() => fetchMatches(true), 60000);
    return () => clearInterval(t);
  }, [fetchMatches, apiToken, demoMode]);

  // Refetch ngay khi người dùng quay lại app (mobile tạm dừng timer khi ở nền,
  // nên không tự cập nhật — tránh phải F5 thủ công). Cũng refetch khi có mạng lại.
  useEffect(() => {
    if (!apiToken && !demoMode) return;
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
  }, [fetchMatches, apiToken, demoMode]);

  return { matches, loading, error, lastUpdated, fetchMatches };
}
