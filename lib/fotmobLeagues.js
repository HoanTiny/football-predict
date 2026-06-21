// Dữ liệu giải đấu (BXH + lịch/kết quả) từ API nội bộ MIỄN PHÍ của FotMob.
// CHỈ gọi server-side (Cloudflare chặn request client). Không cần key.
//
// ⚠️ API không chính thức — cấu trúc có thể đổi/chặn bất cứ lúc nào. Mọi lỗi nuốt gọn,
// trả null/[] để UI tự ẩn khối tương ứng. Trả SHAPE gọn cho client (không lộ payload thô).

const BASE = "https://www.fotmob.com/api";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = new Map(); // path -> { exp, data }
const TABLE_TTL = 1000 * 60 * 5; // BXH: 5 phút
const FIXTURES_TTL = 1000 * 60 * 5; // lịch cả mùa: 5 phút
const BYDATE_TTL = 1000 * 30; // trận theo ngày (cho For You — cần tươi vì có live): 30s

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

// "71-27" -> { gf:71, ga:27 }
function parseScores(str) {
  const m = String(str || "").match(/(\d+)\s*-\s*(\d+)/);
  return m ? { gf: Number(m[1]), ga: Number(m[2]) } : { gf: 0, ga: 0 };
}

// 1 dòng BXH FotMob -> object UI gọn.
function normRow(r) {
  const { gf, ga } = parseScores(r.scoresStr);
  return {
    rank: r.idx ?? null,
    teamId: r.id ?? null,
    name: r.name || r.shortName || "?",
    played: r.played ?? 0,
    wins: r.wins ?? 0,
    draws: r.draws ?? 0,
    losses: r.losses ?? 0,
    gf,
    ga,
    gd: r.goalConDiff ?? gf - ga,
    pts: r.pts ?? 0,
    // màu FotMob đánh dấu suất đi tiếp/xuống hạng (#2AD572…) — dùng làm chấm bên cạnh thứ hạng.
    qualColor: r.qualColor || null,
    ongoing: !!r.ongoing,
  };
}

/**
 * BXH một giải. Trả { leagueName, ccode, ongoing, groups: [{ name, rows:[…] }] }.
 * Giải thường -> 1 group (name=null). Giải chia bảng (World Cup, UCL) -> nhiều group.
 */
export async function fotmobLeagueTable(leagueId) {
  const empty = { leagueName: null, ccode: null, ongoing: false, groups: [] };
  if (!leagueId) return empty;
  try {
    const j = await fm(`/data/leagues?id=${leagueId}&tab=table`, TABLE_TTL);
    const data = j?.table?.[0]?.data;
    if (!data) return empty;

    const groups = [];
    if (Array.isArray(data.table?.all)) {
      groups.push({ name: null, rows: data.table.all.map(normRow) });
    } else if (Array.isArray(data.tables)) {
      for (const g of data.tables) {
        const rows = g?.table?.all;
        if (Array.isArray(rows)) {
          groups.push({ name: g.leagueName || g.shortName || null, rows: rows.map(normRow) });
        }
      }
    }
    return {
      leagueName: data.leagueName || null,
      ccode: data.ccode || null,
      ongoing: !!data.ongoing,
      groups,
    };
  } catch {
    return empty;
  }
}

// 1 trận trong lịch giải -> object UI gọn (cùng shape với normMatch của route lịch theo ngày).
function normFixture(m) {
  const st = m.status || {};
  const score = parseScores(st.scoreStr);
  return {
    id: String(m.id),
    round: m.roundName ?? m.round ?? null,
    utcTime: st.utcTime || null,
    finished: !!st.finished,
    started: !!st.started,
    cancelled: !!st.cancelled,
    // reason.short: "FT" | "HT" | "AET"… hoặc phút hiện tại khi đang đá (FotMob trả ở liveTime).
    statusShort: st.reason?.short || null,
    liveTime: m.status?.liveTime?.short || null,
    home: { id: m.home?.id ?? null, name: m.home?.name || m.home?.shortName || "?", score: st.finished || st.started ? score.gf : null },
    away: { id: m.away?.id ?? null, name: m.away?.name || m.away?.shortName || "?", score: st.finished || st.started ? score.ga : null },
  };
}

/**
 * Toàn bộ lịch + kết quả của giải (cả mùa). Trả { leagueName, matches:[…], firstUnplayedId }.
 * matches đã sort theo thời gian tăng dần.
 */
export async function fotmobLeagueFixtures(leagueId) {
  const empty = { leagueName: null, matches: [], firstUnplayedId: null };
  if (!leagueId) return empty;
  try {
    const j = await fm(`/data/leagues?id=${leagueId}&tab=fixtures`, FIXTURES_TTL);
    const all = j?.fixtures?.allMatches;
    if (!Array.isArray(all)) return empty;
    const matches = all
      .map(normFixture)
      .filter((m) => m.utcTime)
      .sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
    // FotMob có thể trả null (mùa đã xong) hoặc object/id tuỳ giải — lấy id một cách phòng thủ;
    // nếu thiếu, client tự suy ra mốc "trận sắp tới" từ danh sách matches.
    const fu = j?.fixtures?.firstUnplayedMatch;
    const firstUnplayedId =
      fu == null
        ? null
        : String(fu.firstUnplayedMatchId ?? fu.matchId ?? fu.id ?? fu);
    return {
      leagueName: j?.details?.name || null,
      matches,
      firstUnplayedId: firstUnplayedId && firstUnplayedId !== "[object Object]" ? firstUnplayedId : null,
    };
  } catch {
    return empty;
  }
}

/**
 * Trận theo NGÀY (mọi giải FotMob nhóm theo ngày UTC), tuỳ chọn lọc theo danh sách giải.
 * Dùng cho Trang chủ "For You". Mỗi trận kèm leagueId + leagueName để gom nhóm.
 * @param {string} dateKey "YYYYMMDD" (UTC)
 * @param {Array<number|string>} [leagueIds] chỉ giữ trận thuộc các giải này (rỗng = tất cả)
 * @returns {Promise<Array>} mảng trận đã chuẩn hoá (shape giống fixtures + leagueId/leagueName)
 */
export async function fotmobMatchesByDate(dateKey, leagueIds) {
  if (!dateKey) return [];
  const wanted = Array.isArray(leagueIds) && leagueIds.length
    ? new Set(leagueIds.map(String))
    : null;
  try {
    const j = await fm(`/data/matches?date=${dateKey}`, BYDATE_TTL);
    const out = [];
    for (const lg of j?.leagues || []) {
      // FotMob tách giải con (vòng bảng) với parentLeagueId — khớp theo cả id lẫn parent.
      const lid = String(lg.id);
      const pid = lg.parentLeagueId != null ? String(lg.parentLeagueId) : null;
      if (wanted && !wanted.has(lid) && !(pid && wanted.has(pid))) continue;
      const leagueName = lg.parentLeagueName || lg.name || null;
      for (const m of lg.matches || []) {
        const nm = normFixture(m);
        nm.leagueId = pid && wanted && wanted.has(pid) ? Number(pid) : lg.id;
        nm.leagueName = leagueName;
        out.push(nm);
      }
    }
    return out.sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
  } catch {
    return [];
  }
}
