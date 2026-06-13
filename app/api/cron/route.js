import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pushReady, sendToAll, sendToUserIds } from "@/lib/push";

// Chạy trên Node runtime (web-push cần crypto của Node).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KICKOFF_WINDOW_MIN = 15; // nhắc trước giờ bóng lăn (phút)

const sign = (x, y) => (x > y ? 1 : x < y ? -1 : 0);

/** Lấy danh sách user_id đã cược một số trận (chỉ chế độ phòng — lưu ở Supabase). */
async function bettorsByMatch(matchIds) {
  const map = new Map(); // matchId -> [{ userId, homeGoals, awayGoals, wager }]
  if (!matchIds.length) return map;
  const { data } = await supabaseAdmin
    .from("predictions")
    .select("match_id, home_goals, away_goals, wager, players(user_id)")
    .in("match_id", matchIds);
  (data || []).forEach((p) => {
    const userId = p.players?.user_id;
    if (!userId) return;
    if (!map.has(p.match_id)) map.set(p.match_id, []);
    map.get(p.match_id).push({
      userId,
      homeGoals: p.home_goals,
      awayGoals: p.away_goals,
      wager: p.wager,
    });
  });
  return map;
}

export async function GET(request) {
  // Xác thực: Vercel Cron tự gửi "Authorization: Bearer <CRON_SECRET>".
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!pushReady()) {
    return Response.json({ error: "Push/Supabase chưa cấu hình" }, { status: 503 });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return Response.json({ error: "Thiếu FOOTBALL_DATA_TOKEN" }, { status: 503 });
  }

  // 1) Lấy toàn bộ trận
  let matches = [];
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": token }, cache: "no-store" }
    );
    if (!res.ok) {
      return Response.json({ error: `football-data HTTP ${res.status}` }, { status: 502 });
    }
    matches = (await res.json()).matches || [];
  } catch {
    return Response.json({ error: "Không gọi được football-data" }, { status: 502 });
  }

  // 2) Tải state cũ
  const { data: stateRows } = await supabaseAdmin
    .from("match_state")
    .select("match_id, status, home_score, away_score, kickoff_notified, finished_notified");
  const prev = new Map((stateRows || []).map((r) => [r.match_id, r]));

  const now = Date.now();
  const isLive = (s) => s === "IN_PLAY" || s === "PAUSED" || s === "LIVE";

  // Gom sự kiện cần xử lý
  const kickoffMatches = []; // cần nhắc giờ → bettors
  const goalMatches = []; // có bàn thắng → broadcast
  const finishedMatches = []; // vừa kết thúc → bettors (kết quả kèo)
  const upserts = [];

  for (const m of matches) {
    const home = m.score?.fullTime?.home ?? null;
    const away = m.score?.fullTime?.away ?? null;
    const p = prev.get(m.id);
    let kickoffNotified = p?.kickoff_notified || false;
    let finishedNotified = p?.finished_notified || false;

    // --- Nhắc giờ trận ---
    const minsToKickoff = (new Date(m.utcDate).getTime() - now) / 60000;
    if (
      (m.status === "SCHEDULED" || m.status === "TIMED") &&
      minsToKickoff > 0 &&
      minsToKickoff <= KICKOFF_WINDOW_MIN &&
      !kickoffNotified
    ) {
      kickoffMatches.push(m);
      kickoffNotified = true;
    }

    // --- Bàn thắng (live, tỉ số đổi so với lần trước) ---
    if (
      isLive(m.status) &&
      p &&
      home != null &&
      away != null &&
      (home !== p.home_score || away !== p.away_score) &&
      p.home_score != null &&
      p.away_score != null
    ) {
      goalMatches.push(m);
    }

    // --- Kết thúc trận (CHUYỂN từ trạng thái khác sang FINISHED) ---
    // Yêu cầu đã từng thấy trận này ở trạng thái chưa kết thúc (p tồn tại & != FINISHED)
    // để lần chạy đầu không gửi lại kết quả cho mọi trận cũ.
    if (
      m.status === "FINISHED" &&
      home != null &&
      !finishedNotified &&
      p &&
      p.status !== "FINISHED"
    ) {
      finishedMatches.push(m);
      finishedNotified = true;
    }

    upserts.push({
      match_id: m.id,
      status: m.status,
      home_score: home,
      away_score: away,
      kickoff_notified: kickoffNotified,
      finished_notified: finishedNotified,
      updated_at: new Date().toISOString(),
    });
  }

  // 3) Map bettors cho các trận cần nhắm người (kickoff + finished)
  const targetedIds = [
    ...new Set([...kickoffMatches, ...finishedMatches].map((m) => m.id)),
  ];
  const bettors = await bettorsByMatch(targetedIds);

  const tasks = [];

  // Nhắc giờ → người đã cược trận đó
  for (const m of kickoffMatches) {
    const list = bettors.get(m.id) || [];
    const userIds = list.map((b) => b.userId);
    if (!userIds.length) continue;
    tasks.push(
      sendToUserIds(userIds, {
        title: "⏰ Sắp đến giờ bóng lăn!",
        body: `${m.homeTeam?.name} vs ${m.awayTeam?.name} bắt đầu trong ít phút nữa. Theo dõi kèo của bạn nhé!`,
        url: "/",
        tag: `kickoff-${m.id}`,
      })
    );
  }

  // Bàn thắng → broadcast cho tất cả
  for (const m of goalMatches) {
    const h = m.score?.fullTime?.home ?? 0;
    const a = m.score?.fullTime?.away ?? 0;
    tasks.push(
      sendToAll({
        title: "⚽ BÀN THẮNG!",
        body: `${m.homeTeam?.name} ${h} - ${a} ${m.awayTeam?.name}`,
        url: "/",
        tag: `goal-${m.id}`,
      })
    );
  }

  // Kết thúc → từng người cược biết thắng/thua kèo
  for (const m of finishedMatches) {
    const list = bettors.get(m.id) || [];
    if (!list.length) continue;
    const h = m.score?.fullTime?.home ?? 0;
    const a = m.score?.fullTime?.away ?? 0;
    const label = `${m.homeTeam?.name} ${h}-${a} ${m.awayTeam?.name}`;
    for (const b of list) {
      let body;
      if (b.homeGoals === h && b.awayGoals === a) {
        body = `🎯 ${label} — Bạn đoán ĐÚNG TỈ SỐ! +${b.wager * 3} 💎`;
      } else if (sign(b.homeGoals, b.awayGoals) === sign(h, a)) {
        body = `✅ ${label} — Đúng kết quả! +${b.wager} 💎`;
      } else {
        body = `😢 ${label} — Sai rồi! -${b.wager} 💎`;
      }
      tasks.push(
        sendToUserIds([b.userId], {
          title: "🏁 Trận kết thúc",
          body,
          url: "/",
          tag: `result-${m.id}-${b.userId}`,
        })
      );
    }
  }

  await Promise.allSettled(tasks);

  // 4) Lưu lại state
  if (upserts.length) {
    await supabaseAdmin.from("match_state").upsert(upserts, { onConflict: "match_id" });
  }

  return Response.json({
    ok: true,
    kickoff: kickoffMatches.length,
    goals: goalMatches.length,
    finished: finishedMatches.length,
  });
}
