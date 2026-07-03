// Nguồn lịch trận CHUNG cho phần Dự đoán — dùng FotMob (lib/fotmobLeagues.js), CÙNG nguồn với
// phần duyệt trận (components/leagues/*), theo leagueId bất kỳ trong lib/leagues.js. Không cần
// API key, thay cho football-data.org/API-Football (hay lỗi 403/hết quota, chỉ hỗ trợ World Cup).
//
// Map về ĐÚNG shape football-data.org mà UI dự đoán đang dùng (constants.js: realScore(), v.v.)
// để không phải sửa lại MatchCard/BetModal/ScheduleTab/GroupsTab/BracketTab.

import { fotmobLeagueFixtures } from "./fotmobLeagues";

const STATUS_MAP_BY_FLAG = (m) => {
  if (m.cancelled) return "CANCELLED";
  if (m.finished) return "FINISHED";
  if (m.started) return m.statusShort === "HT" ? "PAUSED" : "IN_PLAY";
  return "TIMED";
};

function mapStage(round = "") {
  const r = String(round).toLowerCase();
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter")) return "FINAL";
  if (r.includes("semi")) return "SEMI_FINALS";
  if (r.includes("quarter")) return "QUARTER_FINALS";
  if (r.includes("16")) return "LAST_16";
  if (r.includes("32")) return "LAST_32";
  if (r.includes("3rd") || r.includes("third")) return "THIRD_PLACE";
  if (r.includes("group")) return "GROUP_STAGE";
  return "GROUP_STAGE"; // giải đá vòng tròn cả mùa (Ngoại hạng Anh…) → mỗi vòng coi như 1 matchday
}

// FotMob fixtures không có breakdown hiệp phụ riêng (chỉ có statusShort "AET"/"Pen") — không suy
// được extraTime chính xác, để 0 và dựa vào `pen` (chính xác, đã bù ở fotmobLeagueFixtures) cho
// phần luân lưu; realScore() ở constants.js vẫn tách đúng "tỉ số thật" nhờ trường `penalties`.
function mapFixture(m) {
  const status = STATUS_MAP_BY_FLAG(m);
  const home = m.home?.score ?? null;
  const away = m.away?.score ?? null;
  const hasPen = m.pen && m.pen.home != null && m.pen.away != null;
  const duration = hasPen ? "PENALTY_SHOOTOUT" : m.statusShort === "AET" ? "EXTRA_TIME" : "REGULAR";

  let winner = null;
  if (status === "FINISHED" && home != null && away != null) {
    if (hasPen) winner = m.pen.home > m.pen.away ? "HOME_TEAM" : "AWAY_TEAM";
    else if (home > away) winner = "HOME_TEAM";
    else if (away > home) winner = "AWAY_TEAM";
    else winner = "DRAW";
  }

  return {
    id: m.id,
    utcDate: m.utcTime,
    status,
    minute: null,
    stage: mapStage(m.round),
    matchday: null,
    homeTeam: { id: m.home?.id ?? null, name: m.home?.name || "?" },
    awayTeam: { id: m.away?.id ?? null, name: m.away?.name || "?" },
    score: {
      fullTime: hasPen ? { home: home + m.pen.home, away: away + m.pen.away } : { home, away },
      regularTime: { home, away },
      extraTime: { home: 0, away: 0 },
      penalties: hasPen ? { home: m.pen.home, away: m.pen.away } : null,
      duration,
      winner,
    },
    venue: null,
    referees: [],
  };
}

/** Toàn bộ lịch/kết quả 1 giải (shape football-data-like) cho phần Dự đoán, theo leagueId. */
export async function fetchLeagueMatchesForPredict(leagueId) {
  const { matches } = await fotmobLeagueFixtures(leagueId);
  return matches.filter((m) => m.utcTime).map(mapFixture);
}

/**
 * CHỈ tên đội (không tỉ số/lịch) từ football-data.org — nguồn CŨ trước khi đổi sang FotMob.
 * Dự đoán đặt TRƯỚC khi đổi nguồn lưu match_id theo football-data, nay lịch trận chính đã
 * chuyển sang id của FotMob (khác hệ đánh số) nên tra không ra tên đội → hiện "?"/cờ trắng.
 * Dùng kết quả này làm lớp tra cứu PHỤ (chỉ để hiển thị lại tên đội cho dự đoán cũ), KHÔNG
 * gộp vào danh sách lịch thi đấu chính (tránh trùng lặp trận). Chỉ áp dụng cho World Cup 2026
 * (leagueId 77) vì đó là giải duy nhất từng chạy qua football-data.org trước đây.
 */
// Cache RIÊNG, TTL dài (30 phút) — football-data.org free tier giới hạn 10 req/phút, mà
// route /api/matches có thể được gọi liên tục (poll 60s, nhiều tab/người chơi cùng phòng).
// Đây là dữ liệu tên đội gần như tĩnh (không cần tươi), nên cache dài không sao.
let legacyCache = { exp: 0, data: [] };
const LEGACY_TTL = 1000 * 60 * 30;

export async function fetchLegacyWorldCupTeamNames() {
  if (legacyCache.exp > Date.now()) return legacyCache.data;
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return legacyCache.data; // giữ cache cũ (vd rate-limited) thay vì trả rỗng
    const body = await res.json();
    const data = (body.matches || []).map((m) => ({
      id: String(m.id),
      utcDate: m.utcDate || null,
      status: m.status || "FINISHED",
      homeTeam: { name: m.homeTeam?.name || "?" },
      awayTeam: { name: m.awayTeam?.name || "?" },
    }));
    legacyCache = { exp: Date.now() + LEGACY_TTL, data };
    return data;
  } catch {
    return legacyCache.data;
  }
}
