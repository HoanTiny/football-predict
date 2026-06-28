import { normalizeTeamName } from "./standings";
import { AF_BASE, AF_HEADERS, afReady } from "./apiFootballConfig";

// Nguồn danh sách trận từ API-Football — live tốt hơn football-data:
// có HT (nghỉ giữa hiệp), phút thi đấu, cập nhật ~15s. Map về đúng shape app đang dùng.
// CHỈ chạy server. Có cache để tiết kiệm quota (free 100 req/ngày).

const WC_LEAGUE = process.env.APIFOOTBALL_WC_LEAGUE || "1"; // 1 = World Cup
const WC_SEASON = process.env.APIFOOTBALL_WC_SEASON || "2026";

const TTL = 1000 * 30; // cache 30s — nhiều client dùng chung 1 lần gọi upstream
let cache = { exp: 0, data: null };

export function wcSourceReady() {
  return afReady();
}

// status.short của API-Football → status kiểu football-data mà app đang xử lý
const STATUS_MAP = {
  TBD: "TIMED",
  NS: "TIMED",
  "1H": "IN_PLAY",
  "2H": "IN_PLAY",
  ET: "IN_PLAY",
  BT: "IN_PLAY",
  P: "IN_PLAY",
  LIVE: "IN_PLAY",
  INT: "IN_PLAY",
  HT: "PAUSED", // nghỉ giữa hiệp
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  AWD: "FINISHED",
  WO: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  SUSP: "SUSPENDED",
};

function mapStage(round = "") {
  const r = round.toLowerCase();
  if (r.includes("group")) return "GROUP_STAGE";
  if (r.includes("32")) return "LAST_32";
  if (r.includes("16")) return "LAST_16";
  if (r.includes("quarter")) return "QUARTER_FINALS";
  if (r.includes("semi")) return "SEMI_FINALS";
  if (r.includes("3rd") || r.includes("third")) return "THIRD_PLACE";
  if (r.includes("final")) return "FINAL";
  return "GROUP_STAGE";
}

function mapFixture(f) {
  const short = f.fixture?.status?.short;
  const status = STATUS_MAP[short] || "TIMED";
  const round = f.league?.round || "";
  const md = round.match(/(\d+)\s*$/);
  const home = f.goals?.home ?? null;
  const away = f.goals?.away ?? null;
  // Tỉ số sau 90' + bù giờ (CHƯA tính hiệp phụ/luân lưu) — dùng quyết toán kèo knockout.
  // api-football trả ở score.fulltime; ngoài trận đã đá ET thì score.fulltime == goals.
  const rtHome = f.score?.fulltime?.home ?? null;
  const rtAway = f.score?.fulltime?.away ?? null;

  let winner = null;
  if (status === "FINISHED") {
    if (f.teams?.home?.winner) winner = "HOME_TEAM";
    else if (f.teams?.away?.winner) winner = "AWAY_TEAM";
    else winner = "DRAW";
  }

  return {
    id: f.fixture?.id,
    utcDate: f.fixture?.date,
    status,
    minute: f.fixture?.status?.elapsed ?? null, // phút thi đấu (vd 67)
    stage: mapStage(round),
    matchday: round.toLowerCase().includes("group") && md ? Number(md[1]) : null,
    homeTeam: { name: normalizeTeamName(f.teams?.home?.name) },
    awayTeam: { name: normalizeTeamName(f.teams?.away?.name) },
    score: { fullTime: { home, away }, regularTime: { home: rtHome, away: rtAway }, winner },
    venue: f.fixture?.venue?.name || null,
    referees: f.fixture?.referee ? [{ name: f.fixture.referee }] : [],
  };
}

/** Lấy toàn bộ trận World Cup từ API-Football, đã map về shape app. null nếu chưa có key. */
export async function fetchWorldCupMatches() {
  if (!afReady()) return null;
  if (cache.data && cache.exp > Date.now()) return cache.data;
  const res = await fetch(`${AF_BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}`, {
    headers: AF_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
  const json = await res.json();
  // Hết quota free: API-Football trả HTTP 200 kèm object `errors` (vd requests limit).
  // Ném lỗi để route tự fallback sang football-data.org.
  const errs = json?.errors;
  const hasErr = Array.isArray(errs) ? errs.length > 0 : errs && Object.keys(errs).length > 0;
  if (hasErr) throw new Error(`API-Football errors: ${JSON.stringify(errs)}`);
  const matches = (json?.response || [])
    .map(mapFixture)
    .filter((m) => m.id && m.homeTeam.name && m.awayTeam.name);
  cache = { exp: Date.now() + TTL, data: matches };
  return matches;
}
