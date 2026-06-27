import { flagOf, fmt, betLabel, OU_LINE } from "./constants";
import { getFifaRank } from "./fifaRankings";

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

/**
 * Hệ số LÃI kèo 1X2 (Thắng/Hòa/Thua): ×1 cho mọi lựa chọn → "1 ăn 1"
 * (thắng nhận lãi = đúng tiền cược; tổng nhận về = 2× tiền cược).
 * (Tham số teams giữ lại cho tương thích — hiện không dùng.)
 */
// eslint-disable-next-line no-unused-vars
export function wdlMultiplier(selection, homeTeam, awayTeam) {
  return 1;
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
    const h = m.score.fullTime.home,
      a = m.score.fullTime.away;
    const matchLabel = `${m.homeTeam.name} ${h}-${a} ${m.awayTeam.name}`;
    const pick = betLabel(p);
    const { status, profitMult } = evaluateBet(p, h, a, {
      homeTeam: m.homeTeam?.name,
      awayTeam: m.awayTeam?.name,
    });
    const won = status !== "lost";
    const payout = won ? p.wager * profitMult : -p.wager;
    if (won) chipsGain += p.wager + p.wager * profitMult;
    if (status === "won_exact") {
      const bonus = profitMult > 3 ? ` (cửa dưới ×${profitMult})` : "";
      toasts.push({ msg: `🎉 ${matchLabel} — Đúng tỉ số!${bonus} +${fmt(payout)} 💎`, type: "win" });
    } else if (won) {
      toasts.push({ msg: `✅ ${matchLabel} — Thắng kèo (${pick})! +${fmt(payout)} 💎`, type: "win" });
    } else {
      toasts.push({ msg: `😢 ${matchLabel} — Thua kèo (${pick}). -${fmt(p.wager)} 💎`, type: "lose" });
    }
    return { ...p, status, payout, finalScore: `${h}-${a}` };
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
