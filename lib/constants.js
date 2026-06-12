/* ---------------- HẰNG SỐ DÙNG CHUNG ---------------- */

export const START_CHIPS = 5000;
export const LS_ACTIVE = "wc2026_active_player";
export const LS_TOKEN = "wc2026_apiToken";
export const LS_DEMO = "wc2026_demoMode";
export const LS_PLAYER_PREFIX = "wc2026_player_";
export const LS_MODE = "wc2026_mode"; // 'solo' | 'room'
export const LS_ROOM_CODE = "wc2026_room_code"; // (cũ — chỉ dùng để migrate)
export const LS_ROOM_PLAYER_ID = "wc2026_room_player_id"; // (cũ — chỉ dùng để migrate)
export const LS_ROOM_SESSIONS = "wc2026_room_sessions"; // [{code, playerId, name}] — đa phòng
export const LS_ROOM_ACTIVE = "wc2026_room_active"; // mã phòng đang mở

export const GROUPS = {
  A: [["Mexico", "🇲🇽"], ["South Korea", "🇰🇷"], ["Czech Republic", "🇨🇿"], ["South Africa", "🇿🇦"]],
  B: [["Canada", "🇨🇦"], ["Qatar", "🇶🇦"], ["Switzerland", "🇨🇭"], ["Bosnia & Herzegovina", "🇧🇦"]],
  C: [["Brazil", "🇧🇷"], ["Morocco", "🇲🇦"], ["Haiti", "🇭🇹"], ["Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]],
  D: [["USA", "🇺🇸"], ["Australia", "🇦🇺"], ["Turkey", "🇹🇷"], ["Paraguay", "🇵🇾"]],
  E: [["Germany", "🇩🇪"], ["Ecuador", "🇪🇨"], ["Ivory Coast", "🇨🇮"], ["Curaçao", "🇨🇼"]],
  F: [["Netherlands", "🇳🇱"], ["Japan", "🇯🇵"], ["Sweden", "🇸🇪"], ["Tunisia", "🇹🇳"]],
  G: [["Belgium", "🇧🇪"], ["Iran", "🇮🇷"], ["Egypt", "🇪🇬"], ["New Zealand", "🇳🇿"]],
  H: [["Spain", "🇪🇸"], ["Uruguay", "🇺🇾"], ["Saudi Arabia", "🇸🇦"], ["Cape Verde", "🇨🇻"]],
  I: [["France", "🇫🇷"], ["Senegal", "🇸🇳"], ["Norway", "🇳🇴"], ["Iraq", "🇮🇶"]],
  J: [["Argentina", "🇦🇷"], ["Austria", "🇦🇹"], ["Algeria", "🇩🇿"], ["Jordan", "🇯🇴"]],
  K: [["Portugal", "🇵🇹"], ["Colombia", "🇨🇴"], ["DR Congo", "🇨🇩"], ["Uzbekistan", "🇺🇿"]],
  L: [["England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ["Croatia", "🇭🇷"], ["Ghana", "🇬🇭"], ["Panama", "🇵🇦"]],
};

// football-data.org dùng tên khác với tên hiển thị → alias để tra cờ
const FLAG_ALIASES = {
  "Korea Republic": "🇰🇷", "Czechia": "🇨🇿", "United States": "🇺🇸",
  "Türkiye": "🇹🇷", "Turkiye": "🇹🇷", "Côte d'Ivoire": "🇨🇮", "Ivory Coast": "🇨🇮",
  "IR Iran": "🇮🇷", "Iran": "🇮🇷", "Bosnia and Herzegovina": "🇧🇦", "Bosnia-Herzegovina": "🇧🇦",
  "Netherlands": "🇳🇱", "Holland": "🇳🇱", "Cabo Verde": "🇨🇻",
  "Congo DR": "🇨🇩", "DR Congo": "🇨🇩", "Korea DPR": "🇰🇵",
};

const FLAG_MAP = (() => {
  const m = { ...FLAG_ALIASES };
  Object.values(GROUPS).forEach((teams) => teams.forEach(([name, flag]) => (m[name] = flag)));
  return m;
})();

const TEAM_CODES = {
  "mexico": "mx",
  "south korea": "kr",
  "korea republic": "kr",
  "czech republic": "cz",
  "czechia": "cz",
  "south africa": "za",
  "canada": "ca",
  "qatar": "qa",
  "switzerland": "ch",
  "bosnia & herzegovina": "ba",
  "bosnia and herzegovina": "ba",
  "bosnia-herzegovina": "ba",
  "brazil": "br",
  "morocco": "ma",
  "haiti": "ht",
  "scotland": "gb-sct",
  "usa": "us",
  "united states": "us",
  "australia": "au",
  "turkey": "tr",
  "türkiye": "tr",
  "turkiye": "tr",
  "paraguay": "py",
  "germany": "de",
  "ecuador": "ec",
  "ivory coast": "ci",
  "côte d'ivoire": "ci",
  "curaçao": "cw",
  "netherlands": "nl",
  "japan": "jp",
  "sweden": "se",
  "tunisia": "tn",
  "belgium": "be",
  "iran": "ir",
  "ir iran": "ir",
  "egypt": "eg",
  "new zealand": "nz",
  "spain": "es",
  "uruguay": "uy",
  "saudi arabia": "sa",
  "cape verde": "cv",
  "cabo verde": "cv",
  "france": "fr",
  "senegal": "sn",
  "norway": "no",
  "iraq": "iq",
  "argentina": "ar",
  "austria": "at",
  "algeria": "dz",
  "jordan": "jo",
  "portugal": "pt",
  "colombia": "co",
  "dr congo": "cd",
  "congo dr": "cd",
  "uzbekistan": "uz",
  "england": "gb-eng",
  "croatia": "hr",
  "ghana": "gh",
  "panama": "pa"
};

export const flagImgOf = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const match = Object.keys(TEAM_CODES).find(
    (key) => lower.includes(key) || key.includes(lower)
  );
  if (match) {
    return `https://flagcdn.com/w80/${TEAM_CODES[match]}.png`;
  }
  return null;
};

export const flagOf = (name) => {
  if (!name) return "🏳️";
  if (FLAG_MAP[name]) return FLAG_MAP[name];
  const key = Object.keys(FLAG_MAP).find(
    (k) => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? FLAG_MAP[key] : "🏳️";
};

export const STAGE_LABELS = {
  GROUP_STAGE: "Vòng bảng",
  LAST_32: "Vòng 32",
  LAST_16: "Vòng 16",
  QUARTER_FINALS: "Tứ kết",
  SEMI_FINALS: "Bán kết",
  THIRD_PLACE: "Tranh hạng 3",
  FINAL: "Chung kết",
};

export const FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "TODAY", label: "Hôm nay" },
  { key: "GROUP_STAGE", label: "Vòng bảng" },
  { key: "LAST_32", label: "Vòng 32" },
  { key: "LAST_16", label: "Vòng 16" },
  { key: "QUARTER_FINALS", label: "Tứ kết" },
  { key: "SEMI_FINALS", label: "Bán kết" },
  { key: "FINAL", label: "Chung kết" },
];

export const TABS = [
  { key: "schedule", label: "Lịch thi đấu", icon: "📅" },
  { key: "predictions", label: "Dự đoán", icon: "🎯" },
  { key: "leaderboard", label: "BXH", icon: "🏅" },
  { key: "champion", label: "Vô địch", icon: "👑" },
  { key: "settings", label: "Cài đặt", icon: "⚙️" },
];

export const isLive = (s) => s === "LIVE" || s === "IN_PLAY";

export const DISPLAY_FONT = { fontFamily: "var(--font-oswald), Oswald, sans-serif" };

export const fmt = (n) => n.toLocaleString("vi-VN");
