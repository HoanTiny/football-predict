import { flagOf, fmt, betLabel, OU_LINE } from "./constants";
import { getFifaRank } from "./fifaRankings";

// Các vòng đấu loại trực tiếp — kèo chỉ tính 90 phút (không tính hiệp phụ / luân lưu),
// giống thông lệ nhà cái với kèo 1X2 / Tài Xỉu / BTTS / Chẵn lẻ.
const KNOCKOUT_STAGES = new Set([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

/**
 * Hệ số thưởng khi ĐÚNG CHÍNH XÁC tỉ số (kèo 'score').
 * Cược "cửa dưới" (đội FIFA yếu hơn) thắng → thưởng cao hơn theo độ chênh hạng.
 *   hoà / đội mạnh hơn thắng: ×3 · bất ngờ nhẹ: ×4 · bất ngờ: ×5 · địa chấn: ×6
 */
export function scoreMultiplier(homeGoals, awayGoals, homeTeam, awayTeam) {
  if (homeGoals === awayGoals) return 3; // hoà — không có cửa trên/dưới
  const winner = homeGoals > awayGoals ? homeTeam : awayTeam;
  const loser = homeGoals > awayGoals ? awayTeam : homeTeam;
  const wr = getFifaRank(winner);
  const lr = getFifaRank(loser);
  if (wr == null || lr == null) return 3;
  const gap = wr - lr; // > 0: đội thắng xếp hạng thấp hơn (yếu hơn) → cửa dưới
  if (gap <= 0) return 3;
  if (gap <= 10) return 4;
  if (gap <= 25) return 5;
  return 6;
}

// Decimal odds 1X2 theo độ chênh hạng FIFA — cân bằng tự động theo từng cặp đấu, không cần
// nguồn ngoài. Quy ước decimal: lãi = wager × (odds − 1); tổng nhận về = wager × odds.
//   ngang nhau (|gap|≤5): 2.20 / 3.30 / 2.20  (đều dạng ~1 ăn 1.2)
//   chênh nhẹ (≤15):     1.80 / 3.50 / 3.50
//   chênh rõ (≤30):      1.50 / 3.80 / 5.50
//   chênh lớn (≤60):     1.30 / 4.50 / 7.50  ← gần đúng với ảnh tham khảo
//   đại địa chấn (>60):  1.15 / 6.00 / 12.00
function tierFromGap(absGap) {
  if (absGap <= 5)  return { fav: 2.20, draw: 3.30, dog: 2.20 };
  if (absGap <= 15) return { fav: 1.80, draw: 3.50, dog: 3.50 };
  if (absGap <= 30) return { fav: 1.50, draw: 3.80, dog: 5.50 };
  if (absGap <= 60) return { fav: 1.30, draw: 4.50, dog: 7.50 };
  return                  { fav: 1.15, draw: 6.00, dog: 12.00 };
}

/**
 * Tỉ lệ DECIMAL kèo 1X2 cho từng lựa chọn ('HOME' | 'DRAW' | 'AWAY').
 * Tự suy ra cửa trên/dưới từ FIFA rank của 2 đội (nguồn: lib/fifaRankings).
 * Thiếu rank → mặc định cân bằng 2.20 / 3.30 / 2.20.
 */
export function wdlOdds(selection, homeTeam, awayTeam) {
  const rH = getFifaRank(homeTeam);
  const rA = getFifaRank(awayTeam);
  if (rH == null || rA == null) {
    return selection === "DRAW" ? 3.30 : 2.20;
  }
  // FIFA rank: SỐ NHỎ = mạnh hơn. gap > 0 ⇔ home mạnh hơn (xếp hạng cao hơn).
  const gap = rA - rH;
  const t = tierFromGap(Math.abs(gap));
  if (selection === "DRAW") return t.draw;
  if (gap === 0) return t.fav;
  const homeIsFav = gap > 0;
  if (selection === "HOME") return homeIsFav ? t.fav : t.dog;
  if (selection === "AWAY") return homeIsFav ? t.dog : t.fav;
  return 2.0;
}

/**
 * Hệ số LÃI kèo 1X2 (giữ tên cũ cho mọi nơi đang dùng).
 * profitMult = odds − 1: cược W, thắng → nhận lãi = W × profitMult; tổng nhận về = W × odds.
 */
export function wdlMultiplier(selection, homeTeam, awayTeam) {
  return wdlOdds(selection, homeTeam, awayTeam) - 1;
}

/**
 * Quyết toán THUẦN một kèo theo tỉ số cuối (dùng chung client + cron server).
 * @param pred { betType, selection, homeGoals, awayGoals }
 * @param h, a  tỉ số cuối (home, away)
 * @param ctx  { homeTeam, awayTeam } — tên 2 đội, để tính thưởng cửa dưới cho kèo tỉ số
 * @returns { status, profitMult } — profitMult = lãi nhân tiền cược khi thắng (thua: status 'lost').
 *   payout = status==='lost' ? -wager : wager*profitMult ; chipsGain = status==='lost' ? 0 : wager*(1+profitMult)
 */
export function evaluateBet(pred, h, a, ctx = {}) {
  const total = h + a;
  switch (pred.betType) {
    case "ou": {
      const over = total > OU_LINE;
      const win = (pred.selection === "OVER") === over;
      return { status: win ? "won" : "lost", profitMult: 1 };
    }
    case "btts": {
      const both = h > 0 && a > 0;
      const win = (pred.selection === "YES") === both;
      return { status: win ? "won" : "lost", profitMult: 1 };
    }
    case "oe": {
      const odd = total % 2 === 1;
      const win = (pred.selection === "ODD") === odd;
      return { status: win ? "won" : "lost", profitMult: 1 };
    }
    case "1x2": {
      const res = h > a ? "HOME" : a > h ? "AWAY" : "DRAW";
      if (pred.selection !== res) return { status: "lost", profitMult: 1 };
      return { status: "won", profitMult: wdlMultiplier(pred.selection, ctx.homeTeam, ctx.awayTeam) };
    }
    case "score":
    default: {
      // Chỉ ĐÚNG CHÍNH XÁC tỉ số mới thắng; sai → mất cược.
      if (pred.homeGoals === h && pred.awayGoals === a) {
        const mult = scoreMultiplier(h, a, ctx.homeTeam, ctx.awayTeam);
        return { status: "won_exact", profitMult: mult };
      }
      return { status: "lost", profitMult: 1 };
    }
  }
}

/**
 * Tính kết quả quyết toán cho một người chơi (hàm thuần, không side-effect).
 * Trả về null nếu không có gì thay đổi.
 *
 * @param matches  danh sách trận từ API
 * @param player   { predictions, championPicks, ... }
 * @param alreadySettled  Set matchId đã quyết toán trong phiên (chống chạy lặp)
 * @returns { predictions, championPicks, chipsGain, toasts, settledMatchIds } | null
 */
export function computeSettlement(matches, player, alreadySettled) {
  if (!player || !matches.length) return null;
  const finished = new Map(
    matches
      .filter((m) => m.status === "FINISHED" && m.score?.fullTime?.home != null)
      .map((m) => [m.id, m])
  );
  if (!finished.size) return null;

  let chipsGain = 0;
  let changed = false;
  const toasts = [];
  const settledMatchIds = [];

  // --- Kèo từng trận (mọi loại: tỉ số, tài/xỉu, BTTS, chẵn/lẻ) ---
  const predictions = player.predictions.map((p) => {
    if (p.status !== "pending" || alreadySettled.has(p.matchId)) return p;
    const m = finished.get(p.matchId);
    if (!m) return p;
    settledMatchIds.push(p.matchId);
    changed = true;
    // Knockout: dùng tỉ số 90' (regularTime) nếu có — không tính ET/luân lưu.
    // Vòng bảng & các trường hợp thiếu regularTime: vẫn dùng fullTime như cũ.
    const rt = m.score.regularTime;
    const useRT =
      KNOCKOUT_STAGES.has(m.stage) && rt && rt.home != null && rt.away != null;
    const h = useRT ? rt.home : m.score.fullTime.home;
    const a = useRT ? rt.away : m.score.fullTime.away;
    const ftLabel =
      useRT && (m.score.fullTime.home !== h || m.score.fullTime.away !== a)
        ? ` (chung cuộc ${m.score.fullTime.home}-${m.score.fullTime.away})`
        : "";
    const matchLabel = `${m.homeTeam.name} ${h}-${a} ${m.awayTeam.name}${ftLabel}`;
    const pick = betLabel(p);
    const { status, profitMult } = evaluateBet(p, h, a, {
      homeTeam: m.homeTeam?.name,
      awayTeam: m.awayTeam?.name,
    });
    const won = status !== "lost";
    // 1X2 dùng decimal odds → profitMult có thể là số thập phân; làm tròn về chip nguyên.
    const profit = Math.round(p.wager * profitMult);
    const payout = won ? profit : -p.wager;
    if (won) chipsGain += p.wager + profit;
    if (status === "won_exact") {
      const bonus = profitMult > 3 ? ` (cửa dưới ×${profitMult})` : "";
      toasts.push({ msg: `🎉 ${matchLabel} — Đúng tỉ số!${bonus} +${fmt(payout)} 💎`, type: "win" });
    } else if (won) {
      toasts.push({ msg: `✅ ${matchLabel} — Thắng kèo (${pick})! +${fmt(payout)} 💎`, type: "win" });
    } else {
      toasts.push({ msg: `😢 ${matchLabel} — Thua kèo (${pick}). -${fmt(p.wager)} 💎`, type: "lose" });
    }
    // finalScore: lưu tỉ số dùng quyết toán; nếu knockout có ET khác 90' thì kèm chung cuộc.
    const ftH = m.score.fullTime.home, ftA = m.score.fullTime.away;
    const finalScore =
      useRT && (ftH !== h || ftA !== a) ? `${h}-${a} (CC ${ftH}-${ftA})` : `${h}-${a}`;
    return { ...p, status, payout, finalScore };
  });

  // --- Cược vô địch (mỗi vòng) ---
  // Hỗ trợ cả định dạng mới (championPicks[]) và cũ (championPick đơn)
  const championPicks =
    player.championPicks ||
    (player.championPick
      ? [{ ...player.championPick, stage: "GROUP_STAGE", multiplier: 5 }]
      : []);

  let updatedChampionPicks = championPicks;
  const finalMatch = matches.find(
    (m) => m.stage === "FINAL" && m.status === "FINISHED" && m.score?.winner
  );

  if (finalMatch && championPicks.some((p) => p.status === "pending")) {
    const winnerName =
      finalMatch.score.winner === "HOME_TEAM"
        ? finalMatch.homeTeam.name
        : finalMatch.score.winner === "AWAY_TEAM"
          ? finalMatch.awayTeam.name
          : null;

    if (winnerName) {
      changed = true;
      updatedChampionPicks = championPicks.map((p) => {
        if (p.status !== "pending") return p;
        const correct =
          winnerName === p.team || flagOf(winnerName) === flagOf(p.team);
        if (correct) {
          const profit = Math.round(p.wager * p.multiplier);
          chipsGain += p.wager + profit;
          toasts.push({
            msg: `👑 ${winnerName} vô địch! Cược ×${p.multiplier} trúng! +${fmt(profit)} 💎`,
            type: "win",
          });
          return { ...p, status: "won", payout: profit };
        } else {
          toasts.push({
            msg: `👑 ${winnerName} vô địch — cược ${p.team} không trúng. -${fmt(p.wager)} 💎`,
            type: "lose",
          });
          return { ...p, status: "lost", payout: -p.wager };
        }
      });
    }
  }

  if (!changed) return null;
  return { predictions, championPicks: updatedChampionPicks, chipsGain, toasts, settledMatchIds };
}
