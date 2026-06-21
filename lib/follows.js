"use client";

// "Theo dõi của tôi" — lưu cục bộ trên trình duyệt (Phase 1). Đồng bộ tài khoản để Phase sau.
// Khoá theo ID của FotMob (leagueId / teamId), KHÔNG theo tên (tránh lệch tên giữa nguồn).
//
// Dùng store nhỏ + useSyncExternalStore để mọi component cập nhật ngay khi đổi.
import { useSyncExternalStore } from "react";

const KEY = "wc2026_follows";
const EMPTY = { leagues: [], teams: [] };

let cache = null;
const listeners = new Set();

function read() {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : null;
    cache = {
      leagues: Array.isArray(p?.leagues) ? p.leagues.map(String) : [],
      teams: Array.isArray(p?.teams) ? p.teams.filter((t) => t && t.id != null) : [],
    };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* hết quota / chế độ riêng tư — bỏ qua */
  }
  listeners.forEach((l) => l());
}

export function getFollows() {
  return read();
}
export function isLeagueFollowed(id) {
  return read().leagues.includes(String(id));
}
export function isTeamFollowed(id) {
  return read().teams.some((t) => String(t.id) === String(id));
}

export function toggleLeague(id) {
  const s = String(id);
  const cur = read();
  const has = cur.leagues.includes(s);
  write({
    ...cur,
    leagues: has ? cur.leagues.filter((x) => x !== s) : [...cur.leagues, s],
  });
  return !has;
}

export function toggleTeam(team) {
  if (!team || team.id == null) return false;
  const cur = read();
  const has = cur.teams.some((t) => String(t.id) === String(team.id));
  write({
    ...cur,
    teams: has
      ? cur.teams.filter((t) => String(t.id) !== String(team.id))
      : [...cur.teams, { id: team.id, name: team.name || null }],
  });
  return !has;
}

// Đồng bộ giữa các tab trình duyệt.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Hook: trả { leagues, teams, isLeague, isTeam, toggleLeague, toggleTeam }. */
export function useFollows() {
  const snap = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    leagues: snap.leagues,
    teams: snap.teams,
    isLeague: (id) => snap.leagues.includes(String(id)),
    isTeam: (id) => snap.teams.some((t) => String(t.id) === String(id)),
    toggleLeague,
    toggleTeam,
  };
}
