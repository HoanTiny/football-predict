import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchWorldCupMatches } from "@/lib/wcMatches";
import { normalizeTeamName } from "@/lib/standings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sign = (x, y) => (x > y ? 1 : x < y ? -1 : 0);

// Lấy trận từ ĐÚNG nguồn mà client dùng (api-football nếu có key, fallback football-data)
// để khớp match_id đã lưu trong kèo.
async function getMatches(request) {
  try {
    const m = await fetchWorldCupMatches();
    if (m && m.length) return m;
  } catch {
    /* fallback */
  }
  const token =
    request.headers.get("x-auth-token") || process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": token }, cache: "no-store" }
  );
  if (!res.ok) return [];
  return (await res.json()).matches || [];
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!supabaseAdmin) {
    return Response.json({ error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }

  const matches = await getMatches(request);
  const finished = new Map(
    matches
      .filter((m) => m.status === "FINISHED" && m.score?.fullTime?.home != null)
      .map((m) => [Number(m.id), m])
  );

  let settledPreds = 0;
  let settledChampions = 0;

  // 1) Quyết toán kèo từng trận (mọi người chơi, mọi phòng)
  const { data: pending } = await supabaseAdmin
    .from("predictions")
    .select("id, player_id, match_id, home_goals, away_goals, wager")
    .eq("status", "pending");

  for (const p of pending || []) {
    const m = finished.get(Number(p.match_id));
    if (!m) continue;
    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    let status, payout, gain;
    if (p.home_goals === h && p.away_goals === a) {
      status = "won_exact";
      payout = p.wager * 3;
      gain = p.wager * 4;
    } else if (sign(p.home_goals, p.away_goals) === sign(h, a)) {
      status = "won_outcome";
      payout = p.wager;
      gain = p.wager * 2;
    } else {
      status = "lost";
      payout = -p.wager;
      gain = 0;
    }
    const { error: e1 } = await supabaseAdmin
      .from("predictions")
      .update({ status, payout, final_score: `${h}-${a}` })
      .eq("id", p.id)
      .eq("status", "pending"); // chống quyết toán 2 lần (đua điều kiện)
    if (e1) continue;
    if (gain) {
      await supabaseAdmin.rpc("adjust_chips", { p_id: p.player_id, p_delta: gain });
    }
    settledPreds++;
  }

  // 2) Quyết toán cược vô địch khi CHUNG KẾT đã xong
  const finalMatch = matches.find(
    (m) => m.stage === "FINAL" && m.status === "FINISHED" && m.score?.winner
  );
  if (finalMatch) {
    const winnerName = normalizeTeamName(
      finalMatch.score.winner === "HOME_TEAM"
        ? finalMatch.homeTeam?.name
        : finalMatch.score.winner === "AWAY_TEAM"
          ? finalMatch.awayTeam?.name
          : ""
    );
    if (winnerName) {
      const { data: playersWithPicks } = await supabaseAdmin
        .from("players")
        .select("id, champion_picks")
        .not("champion_picks", "eq", "[]");
      for (const pl of playersWithPicks || []) {
        const picks = pl.champion_picks || [];
        if (!picks.some((p) => p.status === "pending")) continue;
        let gain = 0;
        const updated = picks.map((p) => {
          if (p.status !== "pending") return p;
          const correct = normalizeTeamName(p.team) === winnerName;
          if (correct) {
            const profit = Math.round(p.wager * p.multiplier);
            gain += p.wager + profit;
            return { ...p, status: "won", payout: profit };
          }
          return { ...p, status: "lost", payout: -p.wager };
        });
        await supabaseAdmin.from("players").update({ champion_picks: updated }).eq("id", pl.id);
        if (gain) {
          await supabaseAdmin.rpc("adjust_chips", { p_id: pl.id, p_delta: gain });
        }
        settledChampions++;
      }
    }
  }

  return Response.json({ ok: true, settledPreds, settledChampions });
}
