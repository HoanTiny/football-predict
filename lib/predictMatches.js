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
