/* ---------------- TỔ CHỨC DỮ LIỆU SƠ ĐỒ KNOCKOUT ---------------- */

import { calculateGroupStandings } from "./standings";
import { GROUPS } from "./constants";

/**
 * Sơ đồ Vòng 32 CHÍNH THỨC của World Cup 2026 (trận 73→88, theo thứ tự thời gian).
 * Nguồn: FIFA / Wikipedia "2026 FIFA World Cup knockout stage".
 * Mỗi slot: { t, g } — t="W" nhất bảng · "R" nhì bảng · "3" hạng 3 xuất sắc; g = bảng/nhóm bảng.
 * football-data trả trận knockout theo đúng thứ tự thời gian (UTC) nên map theo index là khớp.
 */
const W = (g) => ({ t: "W", g });
const R = (g) => ({ t: "R", g });
const T3 = (g) => ({ t: "3", g });
const R32_STRUCT = [
  { home: R("A"), away: R("B") }, // 73
  { home: W("E"), away: T3("A/B/C/D/F") }, // 74
  { home: W("F"), away: R("C") }, // 75
  { home: W("C"), away: R("F") }, // 76
  { home: W("I"), away: T3("C/D/F/G/H") }, // 77
  { home: R("E"), away: R("I") }, // 78
  { home: W("A"), away: T3("C/E/F/H/I") }, // 79
  { home: W("L"), away: T3("E/H/I/J/K") }, // 80
  { home: W("D"), away: T3("B/E/F/I/J") }, // 81
  { home: W("G"), away: T3("A/E/H/I/J") }, // 82
  { home: R("K"), away: R("L") }, // 83
  { home: W("H"), away: R("J") }, // 84
  { home: W("B"), away: T3("E/F/G/I/J") }, // 85
  { home: W("J"), away: R("H") }, // 86
  { home: W("K"), away: T3("D/E/I/J/L") }, // 87
  { home: R("D"), away: R("G") }, // 88
];

// Nhãn hiển thị của một slot (khi chưa xác định được đội thật).
function slotText(s) {
  return s.t === "W"
    ? `Nhất ${s.g}`
    : s.t === "R"
      ? `Nhì ${s.g}`
      : `Hạng 3 ${s.g}`;
}

/**
 * Với mỗi bảng A→L, xác định đội ĐÃ CHẮC CHẮN nhất/nhì (nếu có) để điền tên thật vào sơ đồ.
 * - Nhất: chắc chắn khi không đội nào còn cơ hội vượt điểm tối đa (hoặc bảng đã đá xong).
 * - Nhì: chỉ điền khi bảng đã đá xong (tránh sai do còn nhiều biến số / tie-break).
 * Dùng đúng tiêu chí xếp hạng của app (điểm → hiệu số → bàn thắng) cho nhất quán với tab Bảng đấu.
 */
function resolveGroups(matches) {
  const out = {};
  for (const letter of Object.keys(GROUPS)) {
    const st = calculateGroupStandings(matches, letter, null, false);
    if (!st.length) continue;
    const allPlayed = st.every((t) => (t.pj || 0) >= 3);
    const maxOf = (t) => t.pts + 3 * (3 - (t.pj || 0));
    const g = {};
    const first = st[0];
    if (
      first &&
      (allPlayed || st.slice(1).every((u) => first.pts > maxOf(u)))
    ) {
      g.first = first.name;
    }
    if (allPlayed && st[1]) g.second = st[1].name;
    out[letter] = g;
  }
  return out;
}

// Tên đội thật cho slot nếu đã chắc chắn; null nếu chưa (hoặc slot hạng 3).
function slotTeam(s, resolved) {
  if (s.t === "W") return resolved[s.g]?.first || null;
  if (s.t === "R") return resolved[s.g]?.second || null;
  return null;
}

/**
 * Sắp xếp các trận của một vòng theo thời gian rồi tới id (ổn định).
 */
function sortStage(matches, stage) {
  return matches
    .filter((m) => m.stage === stage)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate) || a.id - b.id);
}

/** Chia một mảng thành 2 nửa (nửa đầu cho nhánh trái, nửa sau cho nhánh phải). */
function splitHalves(arr) {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

/**
 * Tổ chức toàn bộ trận knockout thành sơ đồ 2 nhánh đối xứng.
 * Vì dữ liệu API chưa có liên kết nhánh (đội còn TBD), ta xếp theo ngày/id
 * và chia đôi mỗi vòng — đủ để hiển thị sơ đồ trực quan như bản thiết kế.
 */
export function organizeBracket(matches) {
  if (!matches || matches.length === 0) {
    return {
      left: emptySide(),
      right: emptySide(),
      final: null,
      third: null,
      hasData: false,
    };
  }

  const r32raw = sortStage(matches, "LAST_32");
  // Gắn nhãn nhất/nhì/hạng-3 cho từng slot (chỉ khi đủ 16 trận, khớp sơ đồ chính thức);
  // đồng thời điền TÊN ĐỘI THẬT vào slot đã chắc chắn (nhất/nhì bảng).
  const resolved = resolveGroups(matches);
  const r32 =
    r32raw.length === R32_STRUCT.length
      ? r32raw.map((m, i) => {
          const sH = R32_STRUCT[i].home;
          const sA = R32_STRUCT[i].away;
          const out = {
            ...m,
            slot: { home: slotText(sH), away: slotText(sA) },
          };
          const realH = slotTeam(sH, resolved);
          const realA = slotTeam(sA, resolved);
          // Chỉ điền khi feed chưa có đội (không ghi đè đội thật từ API).
          if (!out.homeTeam?.name && realH) out.homeTeam = { name: realH };
          if (!out.awayTeam?.name && realA) out.awayTeam = { name: realA };
          return out;
        })
      : r32raw;
  const r16 = sortStage(matches, "LAST_16");
  const qf = sortStage(matches, "QUARTER_FINALS");
  const sf = sortStage(matches, "SEMI_FINALS");
  const final = sortStage(matches, "FINAL")[0] || null;
  const third = sortStage(matches, "THIRD_PLACE")[0] || null;

  const [r32L, r32R] = splitHalves(r32);
  const [r16L, r16R] = splitHalves(r16);
  const [qfL, qfR] = splitHalves(qf);
  const [sfL, sfR] = splitHalves(sf);

  const hasData =
    r32.length + r16.length + qf.length + sf.length > 0 || !!final;

  return {
    left: { r32: r32L, r16: r16L, qf: qfL, sf: sfL },
    right: { r32: r32R, r16: r16R, qf: qfR, sf: sfR },
    final,
    third,
    hasData,
  };
}

function emptySide() {
  return { r32: [], r16: [], qf: [], sf: [] };
}

/**
 * Trả về tên đội của một slot trong trận knockout, hoặc null nếu chưa xác định.
 */
export function teamName(team) {
  return team && team.name ? team.name : null;
}

/**
 * Tính BXH cho toàn bộ 12 bảng (A→L) cùng lúc — dùng cho trang "Bảng đấu".
 */
export function allGroupStandings(
  matches,
  predictionByMatch = null,
  usePredictions = true,
) {
  return Object.keys(GROUPS).map((letter) => ({
    letter,
    standings: calculateGroupStandings(
      matches,
      letter,
      predictionByMatch,
      usePredictions,
    ),
  }));
}
