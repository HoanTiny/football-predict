import { GROUPS, matchIsLive } from "./constants";

/**
 * Normalizes team names to match database names from GROUPS.
 * This resolves spelling differences in the football-data.org API (e.g., Korea Republic, Czechia, US).
 */
export function normalizeTeamName(name) {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower === "korea republic" || lower === "south korea") return "South Korea";
  if (lower === "czechia" || lower === "czech republic") return "Czech Republic";
  if (lower === "united states" || lower === "usa" || lower === "us") return "USA";
  if (lower === "bosnia and herzegovina" || lower === "bosnia & herzegovina" || lower === "bosnia-herzegovina") return "Bosnia & Herzegovina";
  if (lower === "côte d'ivoire" || lower === "ivory coast") return "Ivory Coast";
  if (lower === "ir iran" || lower === "iran") return "Iran";
  if (lower === "cabo verde" || lower === "cape verde") return "Cape Verde";
  if (lower === "congo dr" || lower === "dr congo") return "DR Congo";
  if (lower === "türkiye" || lower === "turkiye" || lower === "turkey") return "Turkey";
  return name;
}

/**
 * Finds the group letter for a given team name by looking it up in GROUPS.
 */
export function getTeamGroup(teamName) {
  if (!teamName) return null;
  const normName = normalizeTeamName(teamName).toLowerCase();
  for (const [groupLetter, teams] of Object.entries(GROUPS)) {
    if (teams.some(([name]) => normalizeTeamName(name).toLowerCase() === normName)) {
      return groupLetter;
    }
  }
  return null;
}

/**
 * Calculates the standings for a specific group based on matches and optional user predictions.
 * 
 * @param {Array} matches List of all matches from the API
 * @param {string} groupLetter Group letter (A to L)
 * @param {Map} predictionByMatch Map of matchId -> prediction object
 * @param {boolean} usePredictions Whether to incorporate predicted scores for scheduled matches
 */
export function calculateGroupStandings(matches, groupLetter, predictionByMatch = null, usePredictions = false) {
  const groupTeams = GROUPS[groupLetter] || [];
  
  // Initialize standings map with normalized names
  const standings = {};
  groupTeams.forEach(([name, flag]) => {
    const norm = normalizeTeamName(name);
    standings[norm] = {
      name: norm,
      flag,
      pts: 0,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      live: false,        // đội đang có trận diễn ra (tỉ số đang được tính realtime)
      predicted: false,   // BXH có cộng tỉ số dự đoán (trận chưa đá) cho đội này
    };
  });

  // Filter matches for the selected group
  const groupMatches = matches.filter((m) => {
    if (m.stage !== "GROUP_STAGE") return false;
    const homeGroup = getTeamGroup(m.homeTeam?.name);
    return homeGroup === groupLetter;
  });

  groupMatches.forEach((m) => {
    const homeName = normalizeTeamName(m.homeTeam?.name);
    const awayName = normalizeTeamName(m.awayTeam?.name);

    if (!standings[homeName] || !standings[awayName]) return;

    let homeScore = null;
    let awayScore = null;

    const finished = m.status === "FINISHED";
    // Trận đang diễn ra — tỉ số chạy realtime nằm ở score.fullTime (cập nhật mỗi lần poll).
    // matchIsLive cũng nhận diện trường hợp provider trễ status (đã có tỉ số mà chưa FINISHED).
    const live = matchIsLive(m);
    let fromPrediction = false;

    if (finished || live) {
      // Luôn ưu tiên kết quả THẬT (đã đá xong hoặc đang đá), không dùng dự đoán.
      homeScore = m.score?.fullTime?.home;
      awayScore = m.score?.fullTime?.away;
    } else if (usePredictions && predictionByMatch) {
      const pred = predictionByMatch.get(m.id);
      const singlePred = Array.isArray(pred) ? pred[0] : pred;
      if (singlePred) {
        homeScore = singlePred.homeGoals;
        awayScore = singlePred.awayGoals;
        fromPrediction = true;
      }
    }

    // Process result
    if (homeScore != null && awayScore != null) {
      const home = standings[homeName];
      const away = standings[awayName];

      if (live) {
        home.live = true;
        away.live = true;
      }
      if (fromPrediction) {
        home.predicted = true;
        away.predicted = true;
      }

      home.pj += 1;
      away.pj += 1;

      home.gf += homeScore;
      away.gf += awayScore;
      home.gc += awayScore;
      away.gc += homeScore;

      if (homeScore > awayScore) {
        home.pg += 1;
        home.pts += 3;
        away.pp += 1;
      } else if (homeScore < awayScore) {
        away.pg += 1;
        away.pts += 3;
        home.pp += 1;
      } else {
        home.pe += 1;
        away.pe += 1;
        home.pts += 1;
        away.pts += 1;
      }
    }
  });

  // Calculate goal difference and sort
  const list = Object.values(standings);
  list.forEach((t) => {
    t.dg = t.gf - t.gc;
  });

  // FIFA World Cup ranking criteria:
  // 1. Points
  // 2. Goal Difference
  // 3. Goals Scored
  // 4. Alphabetical (fallback)
  list.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });

  return list;
}
