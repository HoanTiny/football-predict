"use client";

// Kho dữ liệu LIVE dùng chung phía client cho /api/match-stats.
// Nhiều component (hero, thẻ trận, …) cùng quan tâm một trận sẽ DÙNG CHUNG một lần fetch
// + một vòng poll 30s, thay vì mỗi component tự gọi → nhẹ & đồng bộ hơn.
import { useEffect, useState } from "react";

const TTL = 25000; // coi dữ liệu còn tươi trong 25s
const POLL = 30000;
const entries = new Map(); // key -> { data, exp, fetching, timer, subs:Set, params }

const keyOf = (p) => `${p.home || ""}|${p.away || ""}|${p.date || ""}`;

async function fetchEntry(e) {
  if (e.fetching) return;
  e.fetching = true;
  try {
    const qs = new URLSearchParams({
      home: e.params.home || "",
      away: e.params.away || "",
      venue: e.params.venue || "",
      date: e.params.date || "",
    });
    const r = await fetch(`/api/match-stats?${qs}`);
    const d = await r.json();
    e.data = { minute: d.liveMinute || null, events: d.events || [], score: d.liveScore || null };
    e.exp = Date.now() + TTL;
    e.subs.forEach((cb) => cb());
  } catch {
    /* nuốt gọn — giữ data cũ */
  } finally {
    e.fetching = false;
  }
}

function ensure(key, params) {
  let e = entries.get(key);
  if (!e) {
    e = { data: null, exp: 0, fetching: false, timer: null, subs: new Set(), params };
    entries.set(key, e);
  }
  e.params = params; // dùng params mới nhất (venue/date có thể đổi)
  return e;
}

function subscribeLive(params, cb) {
  const e = ensure(keyOf(params), params);
  e.subs.add(cb);
  if (!e.data || e.exp < Date.now()) fetchEntry(e);
  if (!e.timer) e.timer = setInterval(() => { if (e.subs.size) fetchEntry(e); }, POLL);
  return () => {
    e.subs.delete(cb);
    if (e.subs.size === 0 && e.timer) {
      clearInterval(e.timer);
      e.timer = null;
    }
  };
}

const EMPTY = { minute: null, events: [], score: null };
const getLive = (params) => entries.get(keyOf(params))?.data || EMPTY;

/**
 * Hook: trả { minute, events, score } cho một trận; chia sẻ fetch/poll với các component khác.
 * @param params {home, away, venue?, date}
 * @param enabled bật khi trận đang đá (tắt → không fetch, trả rỗng)
 */
export function useLiveMatch(params, enabled = true) {
  const [, force] = useState(0);
  const key = keyOf(params);
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeLive(params, () => force((x) => x + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return enabled ? getLive(params) : EMPTY;
}
