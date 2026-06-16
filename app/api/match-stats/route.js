import {
  apiFootballReady,
  resolveTeamId,
  teamForm,
  headToHead,
  upcomingVenue,
  resolveFixtureId,
  fixtureStatistics,
  fixtureEvents,
  fixtureLineups,
} from "@/lib/apiFootball";
import { getWeather } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả dữ liệu thật cho tab "Chi tiết trận đấu": phong độ + H2H + sân/thành phố
// (API-Football, cần RAPIDAPI_KEY) và thời tiết (Open-Meteo, không key).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const home = searchParams.get("home");
  const away = searchParams.get("away");
  const venue = searchParams.get("venue"); // từ football-data, có thể trống
  const date = searchParams.get("date");

  const result = {
    weather: null,
    form: { home: [], away: [] },
    h2h: [],
    venue: venue || null,
    city: null,
    statsAvailable: false,
    matchStats: null, // thống kê live (sút, kiểm soát bóng…)
    events: [], // diễn biến (bàn thắng, thẻ)
    lineups: null, // đội hình xuất phát (có khi đội đã công bố, thường ~30–60' trước trận)
  };

  // Có nên xin lineup không? Chỉ khi trận sắp đá (≤120') hoặc đã đá xong gần đây — tiết kiệm quota.
  const wantLineups = (() => {
    if (!date) return false;
    const kickoff = new Date(date).getTime();
    if (isNaN(kickoff)) return false;
    const diff = kickoff - Date.now();
    return diff <= 2 * 60 * 60 * 1000 && diff > -3 * 60 * 60 * 1000;
  })();

  // 1) Phong độ + H2H + sân/thành phố (API-Football)
  if (apiFootballReady()) {
    try {
      const [homeId, awayId] = await Promise.all([
        resolveTeamId(home),
        resolveTeamId(away),
      ]);
      const [hForm, aForm, h2h, place] = await Promise.all([
        teamForm(homeId),
        teamForm(awayId),
        headToHead(homeId, awayId),
        upcomingVenue(homeId, awayId),
      ]);
      result.form = { home: hForm, away: aForm };
      result.h2h = h2h;
      if (place) {
        result.venue = result.venue || place.name;
        result.city = place.city;
      }
      // Thống kê + diễn biến — tìm ĐÚNG fixture của api-sports theo đội + ngày
      // (không tin match.id vì có thể là id football-data → tra nhầm trận).
      const realId = await resolveFixtureId(homeId, awayId, date);
      if (realId) {
        const [matchStats, events, lineups] = await Promise.all([
          fixtureStatistics(realId),
          fixtureEvents(realId),
          wantLineups ? fixtureLineups(realId).catch(() => null) : Promise.resolve(null),
        ]);
        result.matchStats = matchStats;
        result.events = events;
        result.lineups = lineups;
        result.fixtureId = realId;
      }

      result.statsAvailable = true;
    } catch (e) {
      result.statsError = e.message;
    }
  }

  // 2) Thời tiết — theo tên sân (bảng sân WC) hoặc geocode theo thành phố
  try {
    result.weather = await getWeather({
      venue: result.venue,
      city: result.city,
      isoDate: date,
    });
  } catch {
    result.weather = null;
  }

  return Response.json(result);
}
