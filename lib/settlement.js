import { flagOf, fmt } from "./constants";

/**
 * Tính kết quả quyết toán cho một người chơi (hàm thuần, không side-effect).
 * Trả về null nếu không có gì thay đổi.
 *
 * @param matches  danh sách trận từ API
 * @param player   { predictions, championPick, ... }
 * @param alreadySettled  Set matchId đã quyết toán trong phiên (chống chạy lặp)
 * @returns { predictions, championPick, chipsGain, toasts, settledMatchIds } | null
 */
export function computeSettlement(matches, player, alreadySettled) {
  if (!player || !matches.length) return null;
  const finished = new Map(
    matches.filter((m) => m.status === "FINISHED" && m.score?.fullTime?.home != null).map((m) => [m.id, m])
  );
  if (!finished.size) return null;

  let chipsGain = 0;
  let changed = false;
  const toasts = [];
  const settledMatchIds = [];
  const sign = (x, y) => (x > y ? 1 : x < y ? -1 : 0);

  const predictions = player.predictions.map((p) => {
    if (p.status !== "pending" || alreadySettled.has(p.matchId)) return p;
    const m = finished.get(p.matchId);
    if (!m) return p;
    settledMatchIds.push(p.matchId);
    changed = true;
    const h = m.score.fullTime.home, a = m.score.fullTime.away;
    const matchLabel = `${m.homeTeam.name} ${h}-${a} ${m.awayTeam.name}`;
    let status, payout;
    if (p.homeGoals === h && p.awayGoals === a) {
      status = "won_exact";
      payout = p.wager * 3;
      chipsGain += p.wager + p.wager * 3; // hoàn vốn + thưởng 3x
      toasts.push({ msg: `🎉 ${matchLabel} — Bạn đoán đúng tỉ số! +${fmt(p.wager * 3)} 💎`, type: "win" });
    } else if (sign(p.homeGoals, p.awayGoals) === sign(h, a)) {
      status = "won_outcome";
      payout = p.wager;
      chipsGain += p.wager + p.wager; // hoàn vốn + thưởng 1x
      toasts.push({ msg: `✅ ${matchLabel} — Đúng kết quả! +${fmt(p.wager)} 💎`, type: "win" });
    } else {
      status = "lost";
      payout = -p.wager;
      toasts.push({ msg: `😢 ${matchLabel} — Sai rồi! -${fmt(p.wager)} 💎`, type: "lose" });
    }
    return { ...p, status, payout, finalScore: `${h}-${a}` };
  });

  // Chung kết kết thúc → quyết toán cược vô địch (thưởng 5x)
  let championPick = player.championPick;
  const finalMatch = matches.find((m) => m.stage === "FINAL" && m.status === "FINISHED" && m.score?.winner);
  if (championPick && championPick.status === "pending" && finalMatch) {
    const winnerName =
      finalMatch.score.winner === "HOME_TEAM" ? finalMatch.homeTeam.name :
      finalMatch.score.winner === "AWAY_TEAM" ? finalMatch.awayTeam.name : null;
    if (winnerName) {
      changed = true;
      const correct = winnerName === championPick.team || flagOf(winnerName) === flagOf(championPick.team);
      if (correct) {
        chipsGain += championPick.wager + championPick.wager * 5;
        championPick = { ...championPick, status: "won", payout: championPick.wager * 5 };
        toasts.push({ msg: `👑 ${winnerName} vô địch! Bạn đoán đúng! +${fmt(championPick.payout)} 💎`, type: "win" });
      } else {
        championPick = { ...championPick, status: "lost", payout: -championPick.wager };
        toasts.push({ msg: `👑 ${winnerName} vô địch — cược vô địch của bạn không trúng. -${fmt(championPick.wager)} 💎`, type: "lose" });
      }
    }
  }

  if (!changed) return null;
  return { predictions, championPick, chipsGain, toasts, settledMatchIds };
}
