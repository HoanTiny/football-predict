import { venueLocation } from "./venues";

// Mã thời tiết WMO của Open-Meteo → mô tả tiếng Việt.
const WCODE = {
  0: "Trời quang",
  1: "Ít mây",
  2: "Có mây",
  3: "Nhiều mây",
  45: "Sương mù",
  48: "Sương mù",
  51: "Mưa phùn nhẹ",
  53: "Mưa phùn",
  55: "Mưa phùn dày",
  61: "Mưa nhẹ",
  63: "Mưa",
  65: "Mưa to",
  71: "Tuyết nhẹ",
  73: "Tuyết",
  75: "Tuyết dày",
  80: "Mưa rào",
  81: "Mưa rào",
  82: "Mưa rào lớn",
  95: "Dông",
  96: "Dông kèm mưa đá",
  99: "Dông mạnh",
};

/** Dự báo thời tiết tại sân vào ngày trận đấu (Open-Meteo, miễn phí, không cần key). */
export async function getWeather(venue, isoDate) {
  const loc = venueLocation(venue);
  if (!loc || !isoDate) return loc ? { city: loc.city } : null;
  const date = isoDate.slice(0, 10);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${date}&end_date=${date}&timezone=auto`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { city: loc.city };
    const d = (await res.json())?.daily;
    if (!d?.time?.length) return { city: loc.city };
    const code = d.weather_code?.[0];
    const tmax = d.temperature_2m_max?.[0];
    const tmin = d.temperature_2m_min?.[0];
    const tempC =
      tmax != null && tmin != null ? Math.round((tmax + tmin) / 2) : tmax ?? null;
    return { city: loc.city, tempC, code, text: WCODE[code] || null };
  } catch {
    return { city: loc.city };
  }
}
