import { describe, it, expect } from "vitest";
import { computeSettlement, evaluateBet } from "@/lib/settlement";

const finishedMatch = (id, home, away, h, a) => ({
  id,
  stage: "GROUP_STAGE",
  status: "FINISHED",
  homeTeam: { name: home },
  awayTeam: { name: away },
  score: { fullTime: { home: h, away: a }, winner: null },
});

const player = (predictions) => ({ predictions, championPicks: [] });

describe("computeSettlement", () => {
  it("pays 3x stake profit for exact score", () => {
    const matches = [finishedMatch(1, "Qatar", "Switzerland", 0, 2)];
    const p = player([{ matchId: 1, homeGoals: 0, awayGoals: 2, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("won_exact");
    expect(r.predictions[0].payout).toBe(300);
    expect(r.chipsGain).toBe(100 + 300); // stake back + profit
  });

  it("loses when score is wrong even if the winner is right (exact-only rule)", () => {
    const matches = [finishedMatch(1, "Qatar", "Switzerland", 0, 1)];
    const p = player([{ matchId: 1, homeGoals: 0, awayGoals: 2, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("lost");
    expect(r.chipsGain).toBe(0);
  });

  it("pays a higher multiplier for an exact underdog upset", () => {
    // Qatar (#56) thắng Switzerland (#19) → cửa dưới → ×cao hơn 3
    const matches = [finishedMatch(1, "Qatar", "Switzerland", 2, 0)];
    const p = player([{ matchId: 1, homeGoals: 2, awayGoals: 0, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("won_exact");
    expect(r.predictions[0].payout).toBeGreaterThan(300);
  });

  it("loses stake on wrong prediction", () => {
    const matches = [finishedMatch(1, "Brazil", "Morocco", 1, 1)];
    const p = player([{ matchId: 1, homeGoals: 2, awayGoals: 1, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("lost");
    expect(r.chipsGain).toBe(0); // stake already deducted at bet time
  });

  it("does not re-settle an already settled match", () => {
    const matches = [finishedMatch(1, "Qatar", "Switzerland", 0, 2)];
    const p = player([{ matchId: 1, homeGoals: 0, awayGoals: 2, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set([1]));
    expect(r).toBeNull();
  });

  it("returns null when nothing to settle", () => {
    expect(computeSettlement([], player([]), new Set())).toBeNull();
  });

  it("settles a winning Over 2.5 bet (1x profit)", () => {
    const matches = [finishedMatch(1, "Brazil", "Morocco", 2, 1)]; // tổng 3 > 2.5
    const p = player([{ matchId: 1, betType: "ou", selection: "OVER", wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("won");
    expect(r.chipsGain).toBe(200);
  });

  it("loses an Under bet when total is high", () => {
    const matches = [finishedMatch(1, "Brazil", "Morocco", 2, 1)];
    const p = player([{ matchId: 1, betType: "ou", selection: "UNDER", wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("lost");
    expect(r.chipsGain).toBe(0);
  });
});

describe("evaluateBet", () => {
  it("Over/Under 2.5", () => {
    expect(evaluateBet({ betType: "ou", selection: "OVER" }, 2, 1).status).toBe("won");
    expect(evaluateBet({ betType: "ou", selection: "OVER" }, 1, 1).status).toBe("lost");
    expect(evaluateBet({ betType: "ou", selection: "UNDER" }, 1, 1).status).toBe("won");
  });
  it("BTTS", () => {
    expect(evaluateBet({ betType: "btts", selection: "YES" }, 1, 2).status).toBe("won");
    expect(evaluateBet({ betType: "btts", selection: "YES" }, 1, 0).status).toBe("lost");
    expect(evaluateBet({ betType: "btts", selection: "NO" }, 3, 0).status).toBe("won");
  });
  it("1X2 win/draw/lose + hệ số", () => {
    expect(evaluateBet({ betType: "1x2", selection: "HOME" }, 2, 0).status).toBe("won");
    expect(evaluateBet({ betType: "1x2", selection: "AWAY" }, 2, 0).status).toBe("lost");
    expect(evaluateBet({ betType: "1x2", selection: "DRAW" }, 1, 1).status).toBe("won");
    // Tạm thời ×2 cho mọi lựa chọn (kể cả cửa dưới / hoà).
    expect(evaluateBet({ betType: "1x2", selection: "DRAW" }, 1, 1).profitMult).toBe(2);
    expect(
      evaluateBet({ betType: "1x2", selection: "HOME" }, 1, 0, { homeTeam: "Qatar", awayTeam: "Switzerland" }).profitMult
    ).toBe(2);
  });
  it("Odd/Even total", () => {
    expect(evaluateBet({ betType: "oe", selection: "ODD" }, 2, 1).status).toBe("won"); // 3 lẻ
    expect(evaluateBet({ betType: "oe", selection: "EVEN" }, 1, 1).status).toBe("won"); // 2 chẵn
    expect(evaluateBet({ betType: "oe", selection: "EVEN" }, 2, 1).status).toBe("lost");
  });
  it("score: only exact wins, otherwise lost", () => {
    expect(evaluateBet({ betType: "score", homeGoals: 1, awayGoals: 0 }, 1, 0).status).toBe("won_exact");
    expect(evaluateBet({ betType: "score", homeGoals: 2, awayGoals: 0 }, 1, 0).status).toBe("lost"); // đúng kết quả nhưng sai tỉ số
    expect(evaluateBet({ betType: "score", homeGoals: 0, awayGoals: 1 }, 1, 0).status).toBe("lost");
  });
});
