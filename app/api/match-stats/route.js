import {
  apiFootballReady,
  resolveTeamId,
  teamForm,
  headToHead,
  upcomingVenue,
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
