/* ---------------- DỮ LIỆU DEMO (khi chưa có API token) ---------------- */

export const buildDemoMatches = () => {
  const now = Date.now();
  const iso = (offsetMin) => new Date(now + offsetMin * 60000).toISOString();
  const mk = (id, stage, home, away, utcDate, status, h, a) => ({
    id,
    stage,
    matchday: stage === "GROUP_STAGE" ? 1 : null,
    utcDate,
    status,
    homeTeam: { name: home },
    awayTeam: { name: away },
    score: {
      fullTime: { home: h, away: a },
      winner: h == null ? null : h > a ? "HOME_TEAM" : a > h ? "AWAY_TEAM" : "DRAW",
    },
  });
  return [
    mk(9001, "GROUP_STAGE", "Brazil", "Morocco", iso(-200), "FINISHED", 2, 1),
    mk(9002, "GROUP_STAGE", "Germany", "Ecuador", iso(-150), "FINISHED", 1, 1),
    mk(9003, "GROUP_STAGE", "Argentina", "Algeria", iso(-45), "IN_PLAY", 1, 0),
    mk(9004, "GROUP_STAGE", "France", "Senegal", iso(-50), "PAUSED", 0, 0),
    mk(9005, "GROUP_STAGE", "Spain", "Uruguay", iso(120), "SCHEDULED", null, null),
    mk(9006, "GROUP_STAGE", "England", "Croatia", iso(180), "SCHEDULED", null, null),
    mk(9007, "GROUP_STAGE", "USA", "Australia", iso(60 * 26), "SCHEDULED", null, null),
    mk(9008, "GROUP_STAGE", "Mexico", "South Korea", iso(60 * 28), "SCHEDULED", null, null),
    mk(9009, "FINAL", "Portugal", "Japan", iso(60 * 24 * 30), "SCHEDULED", null, null),
  ];
};
