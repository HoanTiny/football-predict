import {
  apiFootballReady,
  resolveTeamId,
  teamForm,
  headToHead,
} from "@/lib/apiFootball";
import { getWeather } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả dữ liệu thật cho tab "Chi tiết trận đấu": thời tiết (Open-Meteo, không key)
// + phong độ & H2H (API-Football, cần RAPIDAPI_KEY). Tự suy giảm nếu thiếu key.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const home = searchParams.get("home");
  const away = searchParams.get("away");
  const venue = searchParams.get("venue");
  const date = searchParams.get("date");

  const result = {
    weather: null,
    form: { home: [], away: [] },
    h2h: [],
    statsAvailable: false,
  };

  // 1) Thời tiết (miễn phí, không cần key)
  try {
    result.weather = await getWeather(venue, date);
  } catch {
    result.weather = null;
  }

  // 2) Phong độ + H2H (API-Football)
  if (apiFootballReady()) {
    try {
      const [homeId, awayId] = await Promise.all([
        resolveTeamId(home),
        resolveTeamId(away),
      ]);
      const [hForm, aForm, h2h] = await Promise.all([
        teamForm(homeId),
        teamForm(awayId),
        headToHead(homeId, awayId),
      ]);
      result.form = { home: hForm, away: aForm };
      result.h2h = h2h;
      result.statsAvailable = true;
    } catch (e) {
      result.statsError = e.message;
    }
  }

  return Response.json(result);
}
