// Danh mục giải đấu cho trình duyệt đa giải kiểu Apple Sports. ID là id giải của FotMob
// (đã xác minh trực tiếp qua /api/data/leagues?id=). Logo lấy từ CDN FotMob.
//
// Lưu ý: dữ liệu lấy từ API nội bộ (không chính thức) của FotMob — chỉ dùng phi thương mại.

/** Logo giải đấu trên CDN FotMob (PNG nền trong). */
export const leagueLogo = (id) =>
  `https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png`;

/** Logo CLB/đội tuyển trên CDN FotMob. */
export const teamLogo = (id) =>
  id != null
    ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`
    : null;

// Mỗi giải: id FotMob, tên hiển thị (VI), nhãn ngắn cho chip, mã quốc gia (cờ), màu nhấn,
// và `grouped` = true nếu BXH chia bảng (World Cup, Champions League vòng bảng/league phase).
export const LEAGUES = [
  { id: 47, name: "Ngoại hạng Anh", short: "Premier League", ccode: "ENG", accent: "#3D195B" },
  { id: 87, name: "La Liga", short: "La Liga", ccode: "ESP", accent: "#EE8707" },
  { id: 54, name: "Bundesliga", short: "Bundesliga", ccode: "GER", accent: "#D20515" },
  { id: 55, name: "Serie A", short: "Serie A", ccode: "ITA", accent: "#008FD7" },
  { id: 53, name: "Ligue 1", short: "Ligue 1", ccode: "FRA", accent: "#091C3E" },
  { id: 42, name: "Champions League", short: "UCL", ccode: "INT", accent: "#1B458F", grouped: true, bracket: true },
  { id: 73, name: "Europa League", short: "UEL", ccode: "INT", accent: "#FF6900", grouped: true, bracket: true },
  { id: 77, name: "World Cup 2026", short: "World Cup", ccode: "INT", accent: "#334BFF", grouped: true, bracket: true },
  { id: 9088, name: "V-League", short: "V-League", ccode: "VIE", accent: "#DA251D" },
];

export const leagueById = (id) =>
  LEAGUES.find((l) => String(l.id) === String(id)) || null;

export const DEFAULT_LEAGUE_ID = 47;
