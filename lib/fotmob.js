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

// Cache RIÊNG, TTL ngắn cho trạng thái live (status/score/minute đổi liên tục) — tách khỏi
// `cache` 10 phút của findMatchId để không bị phục vụ dữ liệu cũ khi trận đang đá.
const liveCache = new Map();
const LIVE_TTL = 1000 * 15;
async function fmLive(path) {
  const hit = liveCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.data;
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FotMob HTTP ${res.status}`);
  const json = await res.json();
  liveCache.set(path, { exp: Date.now() + LIVE_TTL, data: json });
  return json;
}

const pairKey = (a, b) =>
  [normalizeTeamName(a || ""), normalizeTeamName(b || "")].sort().join("|");
const numericMinute = (short) => {
  const m = short == null ? null : String(short).match(/^\d+/);
  return m ? Number(m[0]) : null;
};

/**
 * Map trạng thái live của FotMob theo các ngày UTC (key "YYYYMMDD").
 * Trả Map: pairKey(home,away) -> { started, finished, score:{home,away}|null, minute:number|null }.
 * Dùng để bù trạng thái/tỉ số cho feed trận khi nguồn chính (football-data) cập nhật trễ.
 */
export async function fotmobLiveStatusMap(dateKeys) {
  const map = new Map();
  for (const dk of dateKeys || []) {
    let data;
    try {
      data = await fmLive(`/data/matches?date=${dk}`);
    } catch {
      continue;
    }
    for (const lg of data?.leagues || []) {
      for (const mt of lg.matches || []) {
        const st = mt.status || {};
        const [h, a] = parseScoreStr(st.scoreStr);
        map.set(pairKey(mt.home?.name, mt.away?.name), {
          started: !!st.started,
          finished: !!st.finished,
          score: (st.started || st.finished) && h != null ? { home: h, away: a } : null,
          minute: numericMinute(st.liveTime?.short),
        });
      }
    }
  }
  return map;
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

// Phút thi đấu của FotMob có ký tự ẩn (U+200E…) → chỉ giữ số và dấu "+".
function cleanMinute(short) {
  if (!short) return null;
  const m = String(short).replace(/[^\d+]/g, "");
  return m ? `${m}'` : null;
}

// Tỉ số LIVE từ header.status.scoreStr (tươi ~realtime — khác football-data hay bị trễ).
function liveScoreOf(data) {
  const [home, away] = parseScoreStr(data?.header?.status?.scoreStr);
  return home != null && away != null ? { home, away } : null;
}

const EMPTY_DETAIL = {
  lineups: null,
  matchStats: null,
  form: { home: [], away: [] },
  h2h: [],
  events: [],
  liveMinute: null,
  liveScore: null,
  venue: null,
  city: null,
  fixtureId: null,
  source: "fotmob",
};

// Diễn biến chính (bàn thắng + thẻ) -> mảng UI dùng chung với api-football (BetModal đọc:
// type "Goal"|"Card", minute, team=tên đội, player, assist, detail "Yellow/Red Card").
// FotMob: content.matchFacts.events.events[] với isHome xác định đội.
function buildEvents(content, homeName, awayName) {
  const arr = content?.matchFacts?.events?.events;
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    const minute = e.time ?? e.timeStr ?? null;
    const player = e.nameStr || e.fullName || e.player?.name || null;
    const team = e.isHome ? homeName : awayName;
    if (e.type === "Goal") {
      out.push({
        type: "Goal",
        minute,
        team,
        player: player ? (e.ownGoal ? `${player} (phản lưới)` : player) : null,
        assist: e.assistInput || null,
      });
    } else if (e.type === "Card") {
      const isRed = String(e.card || "").toLowerCase().includes("red");
      out.push({ type: "Card", minute, team, player, detail: isRed ? "Red Card" : "Yellow Card" });
    }
  }
  return out;
}

// Phút thi đấu hiện tại khi trận đang diễn ra ("67'", "HT", "45+2"…). null nếu chưa/đã đá.
function liveMinuteOf(data) {
  const status = data?.header?.status;
  if (!status || status.finished) return null;
  const halfs = status.halfs || {};
  if (halfs.firstHalfEnded && !halfs.secondHalfStarted) return "HT";
  return cleanMinute(status.liveTime?.short);
}

// Dựng object chi tiết trận từ payload matchDetails của FotMob (đã fetch). Dùng chung cho
// cả tra-theo-tên (fotmobMatchData) lẫn tra-theo-id (fotmobMatchDetailById).
function buildMatchDetail(data, id, fallbackHome, fallbackAway) {
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

  const homeName = lu?.homeTeam?.name || fallbackHome;
  const awayName = lu?.awayTeam?.name || fallbackAway;
  const stadium = content?.matchFacts?.infoBox?.Stadium;

  return {
    lineups,
    matchStats: buildStats(content, homeName, awayName),
    form: buildForm(content?.matchFacts?.teamForm),
    h2h: buildH2H(content?.h2h),
    events: buildEvents(content, homeName, awayName),
    liveMinute: liveMinuteOf(data),
    liveScore: liveScoreOf(data),
    venue: stadium?.name || null,
    city: stadium?.city || null,
    fixtureId: id,
    source: "fotmob",
  };
}

/**
 * Lấy đội hình + thống kê + phong độ + H2H + sân/thành phố của trận từ FotMob.
 * Mọi lỗi -> trả mặc định rỗng gọn gàng (không ném).
 * @returns {Promise<{lineups, matchStats, form, h2h, venue, city, fixtureId, source}>}
 */
export async function fotmobMatchData(home, away, isoDate) {
  if (!home || !away || !isoDate) return { ...EMPTY_DETAIL };
  try {
    const id = await findMatchId(home, away, isoDate);
    if (!id) return { ...EMPTY_DETAIL };
    const data = await fm(`/data/matchDetails?matchId=${id}`, DETAILS_TTL);
    return buildMatchDetail(data, id, home, away);
  } catch {
    return { ...EMPTY_DETAIL };
  }
}

/**
 * Như fotmobMatchData nhưng dùng trực tiếp matchId của FotMob (tin cậy hơn tra-theo-tên).
 * Dành cho trình duyệt đa giải — id lấy từ chính danh sách lịch/kết quả của FotMob.
 */
export async function fotmobMatchDetailById(matchId) {
  if (!matchId) return { ...EMPTY_DETAIL };
  try {
    const data = await fm(`/data/matchDetails?matchId=${matchId}`, DETAILS_TTL);
    return buildMatchDetail(data, matchId, null, null);
  } catch {
    return { ...EMPTY_DETAIL };
  }
}

/* ---------------- SƠ ĐỒ KNOCKOUT (playoff) ---------------- */
const WC_LEAGUE_ID = 77; // parentLeagueId của World Cup trên FotMob
const BRACKET_TTL = 1000 * 60 * 5; // bracket đổi chậm (theo BXH) → cache 5 phút

function halves(arr) {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

// /data/leagues (playoff) trả utcTime LỆCH -2h so với /data/matchDetails (giờ chuẩn).
// Đã verify 16/16 trận R32 lệch CHÍNH XÁC +2h. Workaround: cộng bù 2h ở đây. Nếu FotMob
// fix nguồn → comment dòng utcDateOf ra là xong.
const PLAYOFF_TIME_OFFSET_MS = 2 * 3600 * 1000;
const utcDateOf = (utcTime) =>
  utcTime ? new Date(new Date(utcTime).getTime() + PLAYOFF_TIME_OFFSET_MS).toISOString() : null;

// 1 cặp đấu playoff của FotMob -> shape "match" mà BracketTab dùng.
function bracketMatch(mu) {
  if (!mu) return null;
  const m0 = mu.matches?.[0] || {};
  const st = m0.status || {};
  const finished = !!st.finished;
  return {
    id: m0.matchId ?? null,
    utcDate: utcDateOf(st.utcTime),
    status: finished ? "FINISHED" : st.started ? "IN_PLAY" : "SCHEDULED",
    score: {
      fullTime: {
        home: finished ? m0.home?.score ?? null : null,
        away: finished ? m0.away?.score ?? null : null,
      },
    },
    // tbd → chưa có đội thật, dùng nhãn ngắn (G3A, 1IC, 2KL…) của FotMob làm placeholder.
    homeTeam: { name: mu.tbdTeam1 ? null : mu.homeTeam || null },
    awayTeam: { name: mu.tbdTeam2 ? null : mu.awayTeam || null },
    slot: { home: mu.homeTeamShortName || null, away: mu.awayTeamShortName || null },
    // Mã suất đầy đủ (vd "3ABCDF", "1I") khi chưa có đội — client dùng để liệt kê đội có thể gặp.
    code: {
      home: mu.tbdTeam1 ? mu.homeTeam || null : null,
      away: mu.tbdTeam2 ? mu.awayTeam || null : null,
    },
  };
}

// Dựng 1 biến thể sơ đồ (left/right/final/third) từ mảng rounds + cặp tranh hạng 3.
function buildSide(rounds, bronze) {
  const byStage = {};
  for (const r of rounds || []) byStage[r.stage] = (r.matchups || []).map(bracketMatch);
  const r32 = byStage["1/16"] || [];
  const r16 = byStage["1/8"] || [];
  const qf = byStage["1/4"] || [];
  const sf = byStage["1/2"] || [];
  const final = (byStage["final"] || [])[0] || null;
  const [r32L, r32R] = halves(r32);
  const [r16L, r16R] = halves(r16);
  const [qfL, qfR] = halves(qf);
  const [sfL, sfR] = halves(sf);
  return {
    left: { r32: r32L, r16: r16L, qf: qfL, sf: sfL },
    right: { r32: r32R, r16: r16R, qf: qfR, sf: sfR },
    final,
    third: bracketMatch(bronze),
  };
}

/**
 * Sơ đồ knockout từ FotMob — CẢ HAI biến thể:
 *  - asItStands: điền sẵn đội theo BXH hiện tại (playoff.rounds)
 *  - confirmed: chỉ đội đã chắc chắn, còn lại là mã suất (playoff.namedKnockouts)
 */
export async function fotmobBracket() {
  const empty = { asItStands: null, confirmed: null, hasData: false, source: "fotmob" };
  try {
    const data = await fm(`/data/leagues?id=${WC_LEAGUE_ID}`, BRACKET_TTL);
    const po = data?.playoff;
    if (!Array.isArray(po?.rounds) || !po.rounds.length) return empty;
    const asItStands = buildSide(po.rounds, po.bronzeFinal);
    const confRounds = po.namedKnockouts?.[0]?.rounds;
    const confBronze = po.special?.[0]?.matchups?.[0] || po.bronzeFinal;
    const confirmed =
      Array.isArray(confRounds) && confRounds.length
        ? buildSide(confRounds, confBronze)
        : asItStands;
    return { asItStands, confirmed, hasData: true, source: "fotmob" };
  } catch {
    return empty;
  }
}

/* ---------------- TOP STATS (vua phá lưới, kiến tạo…) ---------------- */
const STATS_TTL = 1000 * 60 * 30; // top stats đổi chậm → cache 30 phút

/**
 * Lấy season ID mới nhất của World Cup (2026) từ meta league.
 * FotMob URL: /data/leagues → stats.seasonStatLinks[0].TournamentId.
 */
async function currentSeasonId() {
  try {
    const j = await fm(`/data/leagues?id=${WC_LEAGUE_ID}`, BRACKET_TTL);
    return j?.stats?.seasonStatLinks?.[0]?.TournamentId || null;
  } catch {
    return null;
  }
}

// Chuẩn hoá 1 dòng stat player về shape mà UI đọc.
function normStatRow(p) {
  return {
    id: p.ParticiantId ?? null, // (FotMob typo: "Particiant") — dùng nguyên
    name: p.ParticipantName || "?",
    teamId: p.TeamId ?? null,
    teamName: p.TeamName || null,
    ccode: p.ParticipantCountryCode || null,
    rank: p.Rank ?? null,
    value: p.StatValue ?? 0,
    subValue: p.SubStatValue ?? null, // vd matches played
    minutes: p.MinutesPlayed ?? null,
    matches: p.MatchesPlayed ?? null,
    positions: p.Positions || null,
    photo: p.ParticiantId
      ? `https://images.fotmob.com/image_resources/playerimages/${p.ParticiantId}.png`
      : null,
  };
}

/**
 * Lấy bảng thống kê cá nhân theo hạng mục (goals / goal_assist / …). Fetch trực tiếp
 * URL data.fotmob.com (đã verify: gzip content, 150 rows) → chuẩn hoá về mảng đơn giản.
 */
export async function fotmobTopStats(category = "goals") {
  const seasonId = await currentSeasonId();
  if (!seasonId) return [];
  const path = `/stats/${WC_LEAGUE_ID}/season/${seasonId}/${category}.json`;
  const url = `https://data.fotmob.com${path}`;
  const cacheKey = `TOP:${path}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Encoding": "gzip" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.TopLists?.[0]?.StatList || [];
    const out = list.map(normStatRow);
    cache.set(cacheKey, { exp: Date.now() + STATS_TTL, data: out });
    return out;
  } catch {
    return [];
  }
}
