/* ---------------- TỔ CHỨC DỮ LIỆU SƠ ĐỒ KNOCKOUT ---------------- */

import { calculateGroupStandings } from "./standings";
import { GROUPS } from "./constants";

/**
 * Sắp xếp các trận của một vòng theo thời gian rồi tới id (ổn định).
 */
function sortStage(matches, stage) {
  return matches
    .filter((m) => m.stage === stage)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate) || (a.id - b.id));
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
    return { left: emptySide(), right: emptySide(), final: null, third: null, hasData: false };
  }

  const r32 = sortStage(matches, "LAST_32");
  const r16 = sortStage(matches, "LAST_16");
  const qf = sortStage(matches, "QUARTER_FINALS");
  const sf = sortStage(matches, "SEMI_FINALS");
  const final = sortStage(matches, "FINAL")[0] || null;
  const third = sortStage(matches, "THIRD_PLACE")[0] || null;

  const [r32L, r32R] = splitHalves(r32);
  const [r16L, r16R] = splitHalves(r16);
  const [qfL, qfR] = splitHalves(qf);
  const [sfL, sfR] = splitHalves(sf);

  const hasData = r32.length + r16.length + qf.length + sf.length > 0 || !!final;

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
export function allGroupStandings(matches, predictionByMatch = null, usePredictions = true) {
  return Object.keys(GROUPS).map((letter) => ({
    letter,
    standings: calculateGroupStandings(matches, letter, predictionByMatch, usePredictions),
  }));
}
