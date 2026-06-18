// Nguồn dự phòng MIỄN PHÍ cho đội hình ra sân + thống kê trận: API nội bộ của FotMob.
// KHÔNG cần key. CHỈ gọi server-side (Cloudflare chặn request từ trình duyệt client).
//
// ⚠️ Đây là API không chính thức: cấu trúc có thể đổi/chặn bất cứ lúc nào. Chỉ dùng làm
// fallback cho phi thương mại — mọi lỗi đều nuốt gọn, trả null để UI tự ẩn khối tương ứng.
//
// Trả về cùng SHAPE với lib/apiFootball.js để UI dùng chung:
//   lineups   -> { home:{team,teamId,formation,coach,startXI:[{number,name,pos,grid}],substitutes:[…]}, away:{…} }
//   matchStats-> { homeTeam, awayTeam, home:{[type]:value}, away:{[type]:value} }   (type theo chuẩn API-Football)
import { normalizeTeamName } from "./standings";

const BASE = "https://www.fotmob.com/api";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = new Map(); // path -> { exp, data }
const MATCHES_TTL = 1000 * 60 * 10; // danh sách trận theo ngày: 10 phút
const DETAILS_TTL = 1000 * 30; // chi tiết trận (live): 30s

async function fm(path, ttl) {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.data;
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FotMob HTTP ${res.status}`);
  const json = await res.json();
  cache.set(path, { exp: Date.now() + ttl, data: json });
  return json;
}

function dateKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${da}`;
}

/** Tìm matchId của FotMob cho trận giữa 2 đội (không phụ thuộc home/away vì cùng một fixture). */
async function findMatchId(home, away, isoDate) {
  const base = new Date(isoDate);
  if (isNaN(base)) return null;
  const H = normalizeTeamName(home);
  const A = normalizeTeamName(away);
  // Thử đúng ngày và ±1 ngày để tránh lệch múi giờ (FotMob nhóm trận theo ngày UTC).
  const days = [base, new Date(base.getTime() - 86400000), new Date(base.getTime() + 86400000)];
  for (const d of days) {
    let data;
    try {
      data = await fm(`/data/matches?date=${dateKey(d)}`, MATCHES_TTL);
    } catch {
      continue;
    }
    for (const lg of data?.leagues || []) {
      for (const m of lg.matches || []) {
        const mh = normalizeTeamName(m.home?.name || "");
        const ma = normalizeTeamName(m.away?.name || "");
        if ((mh === H && ma === A) || (mh === A && ma === H)) return m.id;
      }
    }
  }
  return null;
}

// positionId của FotMob -> chữ vị trí dùng trong UI (G/D/M/F). Dải số tăng dần từ GK ra tiền đạo.
function posLetter(positionId) {
  if (positionId == null) return null;
  if (positionId <= 20) return "G";
  if (positionId < 60) return "D";
  if (positionId < 90) return "M";
  return "F";
}

const fullName = (p) =>
  p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
const shirt = (p) => (p.shirtNumber != null ? String(p.shirtNumber) : null);
// Ảnh chân dung cầu thủ trên CDN FotMob (đã xác minh trả image/png). null nếu thiếu id.
const photoOf = (p) =>
  p.id != null
    ? `https://images.fotmob.com/image_resources/playerimages/${p.id}.png`
    : null;
// Điểm cầu thủ (chỉ có khi trận đang/đã đá). null nếu chưa chấm.
const ratingOf = (p) =>
  typeof p.performance?.rating === "number" ? p.performance.rating : null;

// Diễn biến của riêng cầu thủ: phút vào/ra sân, bàn thắng, kiến tạo, thẻ.
function eventsOf(p) {
  const perf = p.performance || {};
  const subs = perf.substitutionEvents || [];
  const evs = perf.events || [];
  const timeOf = (type) => subs.find((s) => s.type === type)?.time ?? null;
  return {
    subIn: timeOf("subIn"),
    subOut: timeOf("subOut"),
    goals: evs.filter((e) => e.type === "goal").length,
    assists: evs.filter((e) => e.type === "assist").length,
    yellow: evs.some((e) => e.type === "yellowCard"),
    red: evs.some((e) => e.type === "redCard" || e.type === "redCardTwoYellow"),
  };
}

// Thống kê chi tiết từng cầu thủ cho popup khi click (lấy theo `key` ổn định của FotMob).
const DETAIL_KEYS = [
  ["minutes_played", "Số phút thi đấu"],
  ["fouls", "Phạm lỗi"],
  ["accurate_passes", "Lượt chuyền chính xác"],
  ["goals", "Bàn thắng"],
  ["matchstats.headers.tackles", "Tắc bóng thắng"],
  ["assists", "Số lần kiến tạo"],
  ["saves", "Cứu thua"],
  ["chances_created", "Tạo cơ hội"],
  ["total_shots", "Dứt điểm"],
  ["touches", "Chạm bóng"],
];

function buildPlayerDetails(psEntry, ev) {
  const flat = {};
  for (const g of psEntry?.stats || []) {
    for (const [label, obj] of Object.entries(g.stats || {})) {
      const k = obj.key || label;
      if (!(k in flat)) flat[k] = obj.stat?.value;
    }
  }
  const details = DETAIL_KEYS.filter(([k]) => flat[k] != null).map(([k, label]) => ({
    label,
    value: flat[k],
  }));
  // Có ra sân (có chỉ số) thì kèm thẻ vàng/đỏ.
  if (details.length) {
    details.push({ label: "Thẻ vàng", value: ev.yellow ? 1 : 0 });
    details.push({ label: "Thẻ đỏ", value: ev.red ? 1 : 0 });
  }
  return details;
}

// Chuẩn hoá 1 cầu thủ -> object UI dùng (kèm thống kê chi tiết theo id).
function normPlayer(p, psMap, extra = {}) {
  const ev = eventsOf(p);
  return {
    id: p.id ?? null,
    number: shirt(p),
    name: fullName(p),
    pos: posLetter(p.positionId),
    photo: photoOf(p),
    rating: ratingOf(p),
    country: p.countryName || null,
    ...ev,
    details: buildPlayerDetails(psMap[p.id], ev),
    ...extra,
  };
}

/**
 * Dựng grid "row:col" tương thích layoutFull của LineupPitch.
 * FotMob cho mỗi cầu thủ verticalLayout.y (GK ~0.1 → tiền đạo ~0.87) và .x (0=trái,1=phải)
 * theo orientation riêng của từng đội (GK luôn ở y nhỏ nhất). Gom theo y => hàng, theo x => cột.
 */
function buildTeamLineup(t, psMap = {}) {
  const starters = t?.starters;
  if (!Array.isArray(starters) || !starters.length) return null;

  const rounded = (v) => (v == null ? null : Math.round(v * 100) / 100);
  const rows = [...new Set(starters.map((p) => rounded(p.verticalLayout?.y)))]
    .filter((v) => v != null)
    .sort((a, b) => a - b);
  const rowOf = (y) => {
    const idx = rows.indexOf(rounded(y));
    return idx === -1 ? 1 : idx + 1;
  };

  // Cột: trong mỗi hàng, sắp theo x rồi đánh số 1..n
  const colByPlayer = new Map();
  const byRow = new Map();
  starters.forEach((p) => {
    const r = rowOf(p.verticalLayout?.y);
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push(p);
  });
  byRow.forEach((list) => {
    list
      .sort((a, b) => (a.verticalLayout?.x ?? 0) - (b.verticalLayout?.x ?? 0))
      .forEach((p, i) => colByPlayer.set(p, i + 1));
  });

  return {
    team: t.name || null,
    teamId: t.id || null,
    formation: t.formation || null,
    coach: t.coach?.name || null,
    startXI: starters
      .map((p) =>
        normPlayer(p, psMap, {
          grid: `${rowOf(p.verticalLayout?.y)}:${colByPlayer.get(p)}`,
        })
      )
      .filter((p) => p.name),
    substitutes: (t.subs || [])
      .map((p) => normPlayer(p, psMap))
      .filter((p) => p.name),
  };
}

// Tiêu đề thống kê FotMob -> key chuẩn API-Football mà BetModal đang đọc (STAT_ROWS).
const num = (v) => {
  if (v == null) return null;
  const m = String(v).match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : null;
};
const pctInside = (v) => {
  const m = String(v).match(/\((\d+)%\)/); // "242 (76%)" -> "76%"
  return m ? `${m[1]}%` : null;
};

function buildStats(content, homeName, awayName) {
  const groups = content?.stats?.Periods?.All?.stats;
  if (!Array.isArray(groups)) return null;

  // Gộp mọi nhóm thành map: tiêu đề (thường) -> [home, away]
  const flat = new Map();
  for (const g of groups) {
    for (const s of g.stats || []) {
      // Bỏ dòng tiêu đề nhóm (type "title") — trùng tên với stat thật nhưng giá trị rỗng,
      // ví dụ nhóm "Passes" có dòng tiêu đề "Passes" đứng trước dòng số thật.
      if (s.type === "title" || !s.title || !Array.isArray(s.stats)) continue;
      const k = s.title.toLowerCase();
      if (!flat.has(k)) flat.set(k, s.stats);
    }
  }
  const get = (title, idx) => {
    const arr = flat.get(title.toLowerCase());
    return arr ? arr[idx] : undefined;
  };

  const sideStats = (idx) => {
    const poss = get("ball possession", idx);
    const out = {
      "Ball Possession": poss != null ? `${num(poss)}%` : null,
      "Total Shots": num(get("total shots", idx)),
      "Shots on Goal": num(get("shots on target", idx)),
      "Corner Kicks": num(get("corners", idx)),
      Offsides: num(get("offsides", idx)),
      Fouls: num(get("fouls committed", idx)),
      "Yellow Cards": num(get("yellow cards", idx)),
      "Red Cards": num(get("red cards", idx)),
      "Goalkeeper Saves": num(get("keeper saves", idx)),
      "Total passes": num(get("passes", idx)),
      "Passes %": pctInside(get("accurate passes", idx)),
    };
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v != null));
  };

  const home = sideStats(0);
  const away = sideStats(1);
  if (!Object.keys(home).length && !Object.keys(away).length) return null;
  return { homeTeam: homeName, awayTeam: awayName, home, away };
}

// Phong độ -> { home:["W"|"D"|"L"], away:[…] } (5 trận, mới nhất ở cuối — khớp apiFootball).
// FotMob: teamForm = [ [ {resultString}, … ], [ … ] ] (mảng-của-mảng, mỗi đội một mảng).
function buildForm(teamForm) {
  const pick = (entry) => {
    const arr = Array.isArray(entry) ? entry : entry?.value || [];
    return arr
      .map((v) => v.resultString)
      .filter((r) => r === "W" || r === "D" || r === "L")
      .slice(-5);
  };
  if (!Array.isArray(teamForm) || teamForm.length < 2) return { home: [], away: [] };
  return { home: pick(teamForm[0]), away: pick(teamForm[1]) };
}

// "0 - 2" -> [0, 2]
function parseScoreStr(str) {
  const m = String(str || "").match(/(\d+)\s*-\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

// Lịch sử đối đầu -> mảng { date, league, season, home, away, homeGoals, awayGoals } (mới nhất trước).
function buildH2H(h2h) {
  const arr = h2h?.matches;
  if (!Array.isArray(arr) || !arr.length) return [];
  return arr
    .map((m) => {
      const [hg, ag] = parseScoreStr(m.status?.scoreStr);
      const date = m.time?.utcTime || m.status?.utcTime || null;
      return {
        date,
        league: m.league?.name || null,
        season: date ? new Date(date).getUTCFullYear() : null,
        home: m.home?.name || null,
        away: m.away?.name || null,
        homeGoals: hg,
        awayGoals: ag,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
}

/**
 * Lấy đội hình + thống kê + phong độ + H2H + sân/thành phố của trận từ FotMob.
 * Mọi lỗi -> trả mặc định rỗng gọn gàng (không ném).
 * @returns {Promise<{lineups, matchStats, form, h2h, venue, city, fixtureId, source}>}
 */
export async function fotmobMatchData(home, away, isoDate) {
  const empty = {
    lineups: null,
    matchStats: null,
    form: { home: [], away: [] },
    h2h: [],
    venue: null,
    city: null,
    fixtureId: null,
    source: "fotmob",
  };
  if (!home || !away || !isoDate) return empty;
  try {
    const id = await findMatchId(home, away, isoDate);
    if (!id) return empty;
    const data = await fm(`/data/matchDetails?matchId=${id}`, DETAILS_TTL);
    const content = data?.content;
    const lu = content?.lineup;

    const psMap = content?.playerStats || {};
    let lineups = null;
    if (lu?.homeTeam && lu?.awayTeam) {
      const h = buildTeamLineup(lu.homeTeam, psMap);
      const a = buildTeamLineup(lu.awayTeam, psMap);
      // lineupType: "standard" = đã công bố/đang đá; "predicted" = FotMob đoán trước trận.
      if (h && a) lineups = { home: h, away: a, predicted: lu.lineupType !== "standard" };
    }

    const homeName = lu?.homeTeam?.name || home;
    const awayName = lu?.awayTeam?.name || away;
    const stadium = content?.matchFacts?.infoBox?.Stadium;

    return {
      lineups,
      matchStats: buildStats(content, homeName, awayName),
      form: buildForm(content?.matchFacts?.teamForm),
      h2h: buildH2H(content?.h2h),
      venue: stadium?.name || null,
      city: stadium?.city || null,
      fixtureId: id,
      source: "fotmob",
    };
  } catch {
    return empty;
  }
}
