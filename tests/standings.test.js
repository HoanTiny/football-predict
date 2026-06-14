import { describe, it, expect } from "vitest";
import {
  normalizeTeamName,
  getTeamGroup,
  calculateGroupStandings,
} from "@/lib/standings";

describe("normalizeTeamName", () => {
  it("maps known aliases to canonical names", () => {
    expect(normalizeTeamName("Korea Republic")).toBe("South Korea");
    expect(normalizeTeamName("Czechia")).toBe("Czech Republic");
    expect(normalizeTeamName("United States")).toBe("USA");
    expect(normalizeTeamName("Türkiye")).toBe("Turkey");
    expect(normalizeTeamName("Bosnia and Herzegovina")).toBe("Bosnia & Herzegovina");
  });
  it("passes through unknown names", () => {
    expect(normalizeTeamName("Brazil")).toBe("Brazil");
  });
  it("handles empty", () => {
    expect(normalizeTeamName("")).toBe("");
  });
});

describe("getTeamGroup", () => {
  it("finds the group of a team", () => {
    expect(getTeamGroup("Qatar")).toBe("B");
    expect(getTeamGroup("Switzerland")).toBe("B");
    expect(getTeamGroup("Brazil")).toBe("C");
  });
  it("works via alias", () => {
    expect(getTeamGroup("Korea Republic")).toBe("A");
  });
  it("returns null for unknown", () => {
    expect(getTeamGroup("Atlantis")).toBeNull();
  });
});

const mk = (home, away, status, h, a) => ({
  stage: "GROUP_STAGE",
  status,
  utcDate: "2026-06-14T00:00:00Z",
  homeTeam: { name: home },
  awayTeam: { name: away },
  score: { fullTime: { home: h, away: a } },
});

describe("calculateGroupStandings", () => {
  it("counts finished matches with real scores", () => {
    const matches = [mk("Qatar", "Switzerland", "FINISHED", 0, 2)];
    const s = calculateGroupStandings(matches, "B", null, false);
    const swi = s.find((t) => t.name === "Switzerland");
    const qat = s.find((t) => t.name === "Qatar");
    expect(swi.pts).toBe(3);
    expect(swi.dg).toBe(2);
    expect(qat.pts).toBe(0);
    expect(qat.dg).toBe(-2);
  });

  it("does NOT count predictions when usePredictions is false", () => {
    const matches = [mk("Qatar", "Switzerland", "TIMED", null, null)];
    const preds = new Map([[matches[0].id, { homeGoals: 0, awayGoals: 2 }]]);
    const s = calculateGroupStandings(matches, "B", preds, false);
    expect(s.every((t) => t.pts === 0)).toBe(true);
  });

  it("counts a live (IN_PLAY) match by real score", () => {
    const matches = [mk("Qatar", "Switzerland", "IN_PLAY", 1, 0)];
    const s = calculateGroupStandings(matches, "B", null, false);
    expect(s.find((t) => t.name === "Qatar").pts).toBe(3);
    expect(s.find((t) => t.name === "Qatar").live).toBe(true);
  });

  it("sorts by points then goal difference", () => {
    const matches = [
      mk("Qatar", "Switzerland", "FINISHED", 0, 1),
      mk("Canada", "Bosnia & Herzegovina", "FINISHED", 3, 0),
    ];
    const s = calculateGroupStandings(matches, "B", null, false);
    // Canada (+3) should rank above Switzerland (+1) — both 3 pts
    expect(s[0].name).toBe("Canada");
  });
});
