import { describe, it, expect } from "vitest";
import { computeSettlement } from "@/lib/settlement";

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

  it("pays stake profit for correct outcome only", () => {
    const matches = [finishedMatch(1, "Qatar", "Switzerland", 0, 1)];
    const p = player([{ matchId: 1, homeGoals: 0, awayGoals: 2, wager: 100, status: "pending" }]);
    const r = computeSettlement(matches, p, new Set());
    expect(r.predictions[0].status).toBe("won_outcome");
    expect(r.chipsGain).toBe(100 + 100);
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
});
