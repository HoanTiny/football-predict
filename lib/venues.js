// Toạ độ 16 sân chủ nhà World Cup 2026 — dùng cho dự báo thời tiết (Open-Meteo).
// Khớp lỏng theo chuỗi venue trả về từ football-data (so khớp "chứa").
const VENUES = [
  { match: ["metlife"], city: "East Rutherford, NJ", lat: 40.8135, lon: -74.0745 },
  { match: ["at&t", "at t", "arlington"], city: "Arlington, TX", lat: 32.7473, lon: -97.0945 },
  { match: ["nrg", "houston"], city: "Houston, TX", lat: 29.6847, lon: -95.4107 },
  { match: ["arrowhead", "kansas"], city: "Kansas City, MO", lat: 39.0489, lon: -94.4839 },
  { match: ["mercedes-benz", "atlanta"], city: "Atlanta, GA", lat: 33.7554, lon: -84.4008 },
  { match: ["hard rock", "miami"], city: "Miami, FL", lat: 25.958, lon: -80.2389 },
  { match: ["lincoln financial", "philadelphia"], city: "Philadelphia, PA", lat: 39.9008, lon: -75.1675 },
  { match: ["gillette", "foxboro", "foxborough", "boston"], city: "Foxborough, MA", lat: 42.0909, lon: -71.2643 },
  { match: ["lumen", "seattle"], city: "Seattle, WA", lat: 47.5952, lon: -122.3316 },
  { match: ["levi's", "levi", "santa clara"], city: "Santa Clara, CA", lat: 37.403, lon: -121.9698 },
  { match: ["sofi", "inglewood", "los angeles"], city: "Inglewood, CA", lat: 33.9535, lon: -118.3392 },
  { match: ["akron", "guadalajara"], city: "Guadalajara", lat: 20.6817, lon: -103.4626 },
  { match: ["azteca", "banorte", "mexico city", "ciudad de méxico"], city: "Mexico City", lat: 19.3029, lon: -99.1505 },
  { match: ["bbva", "monterrey"], city: "Monterrey", lat: 25.669, lon: -100.2443 },
  { match: ["bmo", "toronto"], city: "Toronto", lat: 43.6332, lon: -79.4185 },
  { match: ["bc place", "vancouver"], city: "Vancouver", lat: 49.2768, lon: -123.1119 },
];

/** Tìm toạ độ + thành phố từ chuỗi venue (vd "MetLife Stadium"). null nếu không khớp. */
export function venueLocation(venue) {
  if (!venue) return null;
  const v = venue.toLowerCase();
  const hit = VENUES.find((e) => e.match.some((m) => v.includes(m)));
  return hit ? { city: hit.city, lat: hit.lat, lon: hit.lon } : null;
}
