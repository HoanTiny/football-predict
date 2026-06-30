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

/* ---------------- LOẠI KÈO DỰ ĐOÁN ----------------
 * Tất cả quyết toán được từ TỈ SỐ CUỐI (football-data: fullTime) → settle tin cậy,
 * không phụ thuộc FotMob. line O/U = 2.5. profit = lãi nhân tiền cược khi thắng.
 */
export const OU_LINE = 2.5;
export const BET_TYPES = {
  score: { label: "Tỉ số", short: "Tỉ số" },
  "1x2": {
    label: "Thắng / Hòa / Thua",
    short: "1X2",
    options: [
      { value: "HOME", label: "Đội nhà" },
      { value: "DRAW", label: "Hòa" },
      { value: "AWAY", label: "Đội khách" },
    ],
  },
  // ou (Tài/Xỉu) & btts (Cả 2 đội ghi bàn) — đã ẩn. Giữ logic settle/label để kèo cũ vẫn chạy.
  oe: {
    label: "Tổng bàn Chẵn / Lẻ",
    short: "Chẵn/Lẻ",
    options: [
      { value: "ODD", label: "Lẻ" },
      { value: "EVEN", label: "Chẵn" },
    ],
  },
};

/**
 * Tỉ số "thật" cho hiển thị + settlement: không tính loạt PEN.
 * football-data trả `score.fullTime = regular + extra + pen TÍCH LUỸ` cho trận đi pen
 * (vd Germany 1-1 Paraguay, Paraguay thắng pen 4-3 → `fullTime = 4-5`).
 *   - `regularTime` (1-1) = sau 90'
 *   - `extraTime`   (0-0) = hiệp phụ
 *   - pen = fullTime − regularTime − extraTime (= 3-4)
 * Trả về { home, away, pen:{home,away}|null, isPen:bool }; null nếu chưa có tỉ số.
 */
export function realScore(match) {
  const s = match?.score;
  if (!s) return null;
  const ft = s.fullTime || {};
  if (ft.home == null || ft.away == null) return null;
  const reg = s.regularTime;
  const ext = s.extraTime || { home: 0, away: 0 };
  const pens = s.penalties; // object {home,away} hoặc null
  // Nhận diện pen: ưu tiên `penalties` field trực tiếp (chính xác); fallback duration string;
  // hoặc tự suy từ chênh lệch lớn giữa fullTime và regular+extra (football-data legacy).
  const hasPenObj = pens && pens.home != null && pens.away != null;
  const isPenByDuration =
    s.duration === "PENALTY_SHOOTOUT" || s.duration === "PENALTIES";
  let isPen = hasPenObj || isPenByDuration;
  // Suy ngược từ subtraction khi không có cờ nhưng có regularTime chênh fullTime nhiều
  // (tổng lệch ≥3 bàn ở knockout gần như chắc chắn là pen, hiếm khi hiệp phụ 3+ bàn).
  if (!isPen && reg && reg.home != null) {
    const diff =
      Math.abs(ft.home - reg.home - (ext.home || 0)) +
      Math.abs(ft.away - reg.away - (ext.away || 0));
    if (diff >= 3) isPen = true;
  }

  if (isPen) {
    // Tỉ số "thật" hiển thị: regular + extra (không tính pen).
    const main =
      reg && reg.home != null
        ? { home: reg.home + (ext.home || 0), away: reg.away + (ext.away || 0) }
        : { home: ft.home, away: ft.away }; // fallback nếu thiếu regularTime
    // PEN: ưu tiên TÍNH BẰNG SUBTRACTION (chính xác). football-data trả `penalties` field
    // nhưng giá trị thường sai (vd 4-4 cho trận 4-5 thực tế). Chỉ fallback `penalties` object
    // khi thiếu `regularTime` để có-còn-hơn-không.
    const subPen = { home: ft.home - main.home, away: ft.away - main.away };
    const subValid =
      subPen.home >= 0 && subPen.away >= 0 && subPen.home + subPen.away > 0;
    const pen = subValid
      ? subPen
      : hasPenObj
        ? { home: pens.home, away: pens.away }
        : null;
    return { ...main, pen: pen || { home: 0, away: 0 }, isPen: true, isAet: (ext.home || 0) + (ext.away || 0) > 0 };
  }

  return {
    home: ft.home,
    away: ft.away,
    pen: null,
    isPen: false,
    isAet: s.duration === "EXTRA_TIME",
  };
}

/** Nhãn ngắn của 1 dự đoán để hiển thị (thẻ trận, danh sách kèo, bạn bè). */
export function betLabel(p) {
  switch (p?.betType) {
    case "1x2":
      return p.selection === "HOME" ? "Nhà thắng" : p.selection === "AWAY" ? "Khách thắng" : "Hòa";
    case "ou":
      return p.selection === "OVER" ? `Tài ${OU_LINE}` : `Xỉu ${OU_LINE}`;
    case "btts":
      return p.selection === "YES" ? "2 đội ghi bàn" : "Không cả 2 ghi";
    case "oe":
      return p.selection === "ODD" ? "Tổng Lẻ" : "Tổng Chẵn";
    case "score":
    default:
      return `${p?.homeGoals ?? "?"}–${p?.awayGoals ?? "?"}`;
  }
}

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
