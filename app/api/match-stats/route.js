import {
  apiFootballReady,
  resolveTeamId,
  teamForm,
  headToHead,
  upcomingVenue,
  fixtureStatistics,
  fixtureEvents,
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
  const fixtureId = searchParams.get("fixtureId"); // = match.id khi nguồn là API-Football

  const result = {
    weather: null,
    form: { home: [], away: [] },
    h2h: [],
    venue: venue || null,
    city: null,
    statsAvailable: false,
    matchStats: null, // thống kê live (sút, kiểm soát bóng…)
    events: [], // diễn biến (bàn thắng, thẻ)
  };

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
      result.statsAvailable = true;
    } catch (e) {
      result.statsError = e.message;
    }

    // Thống kê + diễn biến theo fixture id (chỉ có khi nguồn trận là API-Football).
    if (fixtureId) {
      try {
        const [matchStats, events] = await Promise.all([
          fixtureStatistics(fixtureId),
          fixtureEvents(fixtureId),
        ]);
        result.matchStats = matchStats;
        result.events = events;
      } catch {
        /* bỏ qua — trận chưa có thống kê hoặc id không khớp */
      }
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
