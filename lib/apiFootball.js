// Helper gọi API-Football (CHỈ server). Nhà cung cấp + key lấy từ apiFootballConfig.
// Có cache in-memory (theo instance serverless) để hạn chế số request gói free.
import { AF_BASE, AF_HEADERS, afReady } from "./apiFootballConfig";

export function apiFootballReady() {
  return afReady();
}

const cache = new Map(); // path -> { exp, data }
const TTL = 1000 * 60 * 60 * 6; // 6 giờ

async function af(path, ttl = TTL) {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.data;
  const res = await fetch(AF_BASE + path, {
    headers: AF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
  const json = await res.json();
  cache.set(path, { exp: Date.now() + ttl, data: json });
  return json;
}

const LIVE_TTL = 1000 * 20; // dữ liệu live (thống kê/diễn biến) cache ngắn 20s

/** Thống kê trận (sút, sút trúng đích, kiểm soát bóng…) theo fixture id của API-Football. */
export async function fixtureStatistics(fixtureId) {
  if (!fixtureId) return null;
  const data = await af(`/fixtures/statistics?fixture=${fixtureId}`, LIVE_TTL);
  const arr = data?.response || [];
  if (arr.length < 2) return null;
  const toMap = (s) =>
    Object.fromEntries((s.statistics || []).map((x) => [x.type, x.value]));
  return {
    homeTeam: arr[0]?.team?.name || null,
    awayTeam: arr[1]?.team?.name || null,
    home: toMap(arr[0]),
    away: toMap(arr[1]),
  };
}

/** Diễn biến trận (bàn thắng, thẻ, thay người) theo fixture id. */
export async function fixtureEvents(fixtureId) {
  if (!fixtureId) return [];
  const data = await af(`/fixtures/events?fixture=${fixtureId}`, LIVE_TTL);
  return (data?.response || []).map((e) => ({
    minute: e.time?.elapsed ?? null,
    extra: e.time?.extra ?? null,
    team: e.team?.name || null,
    player: e.player?.name || null,
    assist: e.assist?.name || null,
    type: e.type || null, // Goal | Card | subst | Var
    detail: e.detail || null, // Normal Goal | Yellow Card | ...
  }));
}

/** Tên đội → team id của API-Football (ưu tiên đội tuyển quốc gia). */
export async function resolveTeamId(name) {
  if (!name) return null;
  const data = await af(`/teams?search=${encodeURIComponent(name)}`);
  const list = data?.response || [];
  const natl = list.find((x) => x.team?.national) || list[0];
  return natl?.team?.id || null;
}

/** Phong độ 5 trận gần nhất → mảng "W" | "D" | "L" (mới nhất ở cuối). */
export async function teamForm(teamId) {
  if (!teamId) return [];
  const data = await af(`/fixtures?team=${teamId}&last=5`);
  const fx = (data?.response || []).slice().reverse();
  return fx.map((f) => {
    const isHome = f.teams?.home?.id === teamId;
    const won = isHome ? f.teams?.home?.winner : f.teams?.away?.winner;
    if (won === true) return "W";
    if (won === false) return "L";
    return "D";
  });
}

/** Sân + thành phố của trận sắp tới giữa 2 đội (để tra thời tiết khi football-data thiếu venue). */
export async function upcomingVenue(homeId, awayId) {
  if (!homeId || !awayId) return null;
  const data = await af(`/fixtures/headtohead?h2h=${homeId}-${awayId}&next=1`);
  const f = (data?.response || [])[0];
  const v = f?.fixture?.venue;
  return v ? { name: v.name || null, city: v.city || null } : null;
}

/** Lịch sử đối đầu gần nhất giữa 2 đội. */
export async function headToHead(homeId, awayId) {
  if (!homeId || !awayId) return [];
  const data = await af(`/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`);
  return (data?.response || []).map((f) => ({
    date: f.fixture?.date,
    league: f.league?.name,
    season: f.league?.season,
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
    homeGoals: f.goals?.home,
    awayGoals: f.goals?.away,
  }));
}
