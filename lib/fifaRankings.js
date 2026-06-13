import { normalizeTeamName } from "./standings";

// Bảng xếp hạng FIFA nam — ảnh chụp THÁNG 6/2026 (thời điểm World Cup 2026 khởi tranh).
// Nguồn: ESPN "FIFA Men's Top 50 (June 2026)", Goal.com, HITC. Cập nhật tay định kỳ.
// Key dùng tên chuẩn (đã qua normalizeTeamName).
const FIFA_RANK = {
  Argentina: 1,
  Spain: 2,
  France: 3,
  England: 4,
  Portugal: 5,
  Brazil: 6,
  Netherlands: 7,
  Morocco: 8,
  Belgium: 9,
  Germany: 10,
  Croatia: 11,
  Colombia: 13,
  Senegal: 14,
  Mexico: 15,
  USA: 16,
  Uruguay: 17,
  Japan: 18,
  Switzerland: 19,
  Iran: 20,
  Turkey: 22,
  Ecuador: 23,
  Austria: 24,
  "South Korea": 25,
  Australia: 27,
  Algeria: 28,
  Egypt: 29,
  Canada: 30,
  Norway: 31,
  "Ivory Coast": 33,
  Panama: 34,
  Sweden: 38,
  "Czech Republic": 40,
  Paraguay: 41,
  Scotland: 42,
  Tunisia: 45,
  "DR Congo": 46,
  Uzbekistan: 50,
  Qatar: 56,
  Iraq: 57,
  "South Africa": 60,
  "Saudi Arabia": 61,
  Jordan: 63,
  "Bosnia & Herzegovina": 64,
  "Cape Verde": 67,
  Ghana: 73,
  "Curaçao": 82,
  Haiti: 83,
  "New Zealand": 85,
};

/** Hạng FIFA thế giới của đội (số), hoặc null nếu chưa có trong bảng. */
export function getFifaRank(teamName) {
  if (!teamName) return null;
  return FIFA_RANK[normalizeTeamName(teamName)] ?? null;
}
