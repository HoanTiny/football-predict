// Bù trạng thái + tỉ số + phút LIVE từ FotMob cho feed trận đấu, vì nguồn chính
// (football-data gói free) thường cập nhật trễ 1-2 phút khi trận đang diễn ra:
// trận đã đá + có chỉ số mà feed vẫn báo TIMED → app không nhận ra "đang trực tiếp".
//
// CHỈ nâng trạng thái SCHEDULED/TIMED -> IN_PLAY (không bao giờ tự đặt FINISHED — để
// việc kết thúc & quyết toán do nguồn chính quyết định, tránh chốt sớm sai tỉ số).
import { fotmobLiveStatusMap } from "./fotmob";
import { normalizeTeamName } from "./standings";

const utcDateKey = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${da}`;
};
const pairKey = (a, b) =>
  [normalizeTeamName(a || ""), normalizeTeamName(b || "")].sort().join("|");

/**
 * Nhận mảng trận (shape app: homeTeam.name, awayTeam.name, utcDate, status, score.fullTime),
 * trả lại chính mảng đó với các trận đang đá đã được bù từ FotMob. Mọi lỗi -> trả nguyên trạng.
 */
export async function enrichLiveScores(matches) {
  if (!Array.isArray(matches) || !matches.length) return matches;
  const now = Date.now();

  // Chỉ xét trận trong "cửa sổ live" mà feed CHƯA coi là live (đỡ gọi FotMob thừa).
  const candidates = matches.filter((m) => {
    const ko = m?.utcDate ? new Date(m.utcDate).getTime() : NaN;
    if (isNaN(ko)) return false;
    const inWindow = now >= ko - 5 * 60000 && now <= ko + 3.5 * 3600000;
    const notDone = m.status !== "FINISHED" && m.status !== "CANCELLED";
    const feedNotLive = m.status !== "IN_PLAY" && m.status !== "PAUSED";
    return inWindow && notDone && feedNotLive;
  });
  if (!candidates.length) return matches;

  // FotMob nhóm trận theo ngày UTC — gom ngày của trận và ngày liền trước (trận tối giờ VN
  // rơi sang ngày UTC khác).
  const keys = new Set();
  for (const m of candidates) {
    const d = new Date(m.utcDate);
    keys.add(utcDateKey(d));
    keys.add(utcDateKey(new Date(d.getTime() - 86400000)));
  }

  let map;
  try {
    map = await fotmobLiveStatusMap([...keys]);
  } catch {
    return matches;
  }

  for (const m of candidates) {
    const fm = map.get(pairKey(m.homeTeam?.name, m.awayTeam?.name));
    if (fm && fm.started && !fm.finished) {
      m.status = "IN_PLAY";
      if (fm.score) m.score = { ...(m.score || {}), fullTime: fm.score };
      if (fm.minute != null) m.minute = fm.minute;
    }
  }
  return matches;
}
