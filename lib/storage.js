/* ---------------- LOCALSTORAGE (hồ sơ người chơi) ---------------- */

import { LS_PLAYER_PREFIX } from "./constants";

export const loadPlayer = (name) => {
  try {
    const raw = localStorage.getItem(LS_PLAYER_PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const savePlayer = (p) => {
  localStorage.setItem(LS_PLAYER_PREFIX + p.playerName, JSON.stringify(p));
};

export const allPlayers = () => {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PLAYER_PREFIX)) {
      try {
        out.push(JSON.parse(localStorage.getItem(k)));
      } catch {}
    }
  }
  return out;
};
