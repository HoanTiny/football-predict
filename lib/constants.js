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
export const LS_LEFT_ROOMS = "wc2026_left_rooms"; // [code] — phòng đã rời (ẩn trên thiết bị này)

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
  { key: "UPCOMING", label: "Sắp tới" },
  { key: "TODAY", label: "Hôm nay" },
  { key: "TOMORROW", label: "Ngày mai" },
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

/** Trạng thái live theo provider (bao gồm cả nghỉ giữa hiệp). */
export const isLiveStatus = (s) => isLive(s) || s === "PAUSED";

/**
 * Trận có đang diễn ra không — bền với việc football-data (gói free) cập nhật
 * status trễ: nếu đã có tỉ số mà chưa FINISHED thì coi như đang diễn ra.
 */
export function matchIsLive(match) {
  const s = match?.status;
  if (!s || s === "FINISHED") return false;
  if (isLiveStatus(s)) return true;
  const ft = match.score?.fullTime || {};
  return ft.home != null && ft.away != null;
}

/**
 * Nhãn trạng thái trực tiếp tiếng Việt từ mã ngắn của FotMob (liveTime.short)
 * hoặc số phút thuần. VD: "HT" -> "Giải lao", "67" -> "67'", "45+2" -> "45+2'".
 */
export function liveStatusVN(short) {
  if (short == null || short === "") return "Trực tiếp";
  const s = String(short).trim();
  const map = { HT: "Giải lao", FT: "Kết thúc", AET: "Hiệp phụ", Pen: "Luân lưu", "Pen.": "Luân lưu" };
  if (map[s]) return map[s];
  // Phút: số (có thể kèm "+2") -> thêm dấu '
  if (/^\d/.test(s)) return s.endsWith("'") ? s : `${s}'`;
  return s;
}

export const DISPLAY_FONT = { fontFamily: "var(--font-oswald), Oswald, sans-serif" };

export const fmt = (n) => n.toLocaleString("vi-VN");

// ===== CHAMPION BET SYSTEM =====

export const STAGE_MULTIPLIERS = {
  GROUP_STAGE: 10,
  LAST_32: 8,
  LAST_16: 6,
  QUARTER_FINALS: 4,
  SEMI_FINALS: 3,
  FINAL: 2,
};

export const CHAMPION_STAGES = [
  { key: "GROUP_STAGE",   label: "Vòng bảng", mult: 10 },
  { key: "LAST_32",       label: "Vòng 32",   mult: 8 },
  { key: "LAST_16",       label: "Vòng 16",   mult: 6 },
  { key: "QUARTER_FINALS",label: "Tứ kết",    mult: 4 },
  { key: "SEMI_FINALS",   label: "Bán kết",   mult: 3 },
  { key: "FINAL",         label: "Chung kết", mult: 2 },
];

// FIFA tier (1 = top favourite, 4 = underdog) — determines team odds modifier
const TEAM_FIFA_TIER = {
  "Argentina": 1, "France": 1, "England": 1, "Belgium": 1, "Brazil": 1,
  "Portugal": 1, "Spain": 1, "Netherlands": 1, "Germany": 1, "Uruguay": 1,
  "Colombia": 2, "USA": 2, "Morocco": 2, "Japan": 2, "Croatia": 2,
  "Mexico": 2, "Switzerland": 2, "South Korea": 2, "Norway": 2, "Ecuador": 2,
  "Sweden": 2, "Senegal": 2, "Australia": 2, "Turkey": 2, "Austria": 2, "Algeria": 2,
  "Iran": 3, "Czech Republic": 3, "Tunisia": 3, "Egypt": 3, "Ivory Coast": 3,
  "South Africa": 3, "Saudi Arabia": 3, "Paraguay": 3, "New Zealand": 3, "Cape Verde": 3,
  "Qatar": 4, "Canada": 4, "Haiti": 4, "Bosnia & Herzegovina": 4, "Jordan": 4,
  "Uzbekistan": 4, "Panama": 4, "Ghana": 4, "Iraq": 4, "Curaçao": 4,
  "Scotland": 4, "DR Congo": 4,
};

export const TIER_MULT = { 1: 1, 2: 1.5, 3: 2, 4: 3 };
export const TIER_LABEL = {
  1: "⭐⭐⭐⭐⭐ Top 10 FIFA",
  2: "⭐⭐⭐⭐ Đội mạnh",
  3: "⭐⭐⭐ Trung bình",
  4: "⭐⭐ Ngựa ô",
};

export const getTeamTier = (name) => {
  if (!name) return 4;
  if (TEAM_FIFA_TIER[name]) return TEAM_FIFA_TIER[name];
  const lower = name.toLowerCase();
  const k = Object.keys(TEAM_FIFA_TIER).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  return k ? TEAM_FIFA_TIER[k] : 4;
};

/** Final multiplier applied to wager as NET PROFIT: stage_mult × team_tier_mult */
export const getChampionOdds = (stage, teamName) => {
  const s = STAGE_MULTIPLIERS[stage] ?? 2;
  const t = TIER_MULT[getTeamTier(teamName)] ?? 1;
  return Math.round(s * t * 10) / 10;
};
