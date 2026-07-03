import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendToAll, sendToUserIds } from "@/lib/push";
import { sendFcmDataToUserIds } from "@/lib/pushFcm";
import { evaluateBet } from "@/lib/settlement";
import { betLabel } from "@/lib/constants";
import { fetchLeagueMatchesForPredict } from "@/lib/predictMatches";
import { teamLogo } from "@/lib/leagues";
import { fotmobMatchDetailById } from "@/lib/fotmob";

// Chạy trên Node runtime (web-push cần crypto của Node).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nhắc trước giờ bóng lăn (phút). Chỉnh qua env KICKOFF_REMINDER_MIN (mặc định 15).
const KICKOFF_WINDOW_MIN = Number(process.env.KICKOFF_REMINDER_MIN) || 15;

/** Lấy danh sách user_id đã cược một số trận (chỉ chế độ phòng — lưu ở Supabase). */
async function bettorsByMatch(matchIds) {
  const map = new Map(); // matchId -> [{ userId, homeGoals, awayGoals, wager }]
  if (!matchIds.length) return map;
  const { data } = await supabaseAdmin
    .from("predictions")
    .select("match_id, home_goals, away_goals, wager, bet_type, selection, players(user_id)")
    .in("match_id", matchIds);
  (data || []).forEach((p) => {
    const userId = p.players?.user_id;
    if (!userId) return;
    if (!map.has(p.match_id)) map.set(p.match_id, []);
    map.get(p.match_id).push({
      userId,
      betType: p.bet_type || "score",
      selection: p.selection,
      homeGoals: p.home_goals,
      awayGoals: p.away_goals,
      wager: p.wager,
    });
  });
  return map;
}

/** Lấy user_id đang theo dõi (follow) một số đội — bảng favorite_teams (hooks/useFavTeams). */
async function followersByTeam(teamIds) {
  const map = new Map(); // teamId (string) -> Set(userId)
  if (!teamIds.length) return map;
  const { data } = await supabaseAdmin
    .from("favorite_teams")
    .select("team_id, user_id")
    .in("team_id", teamIds);
  (data || []).forEach((r) => {
    if (!map.has(r.team_id)) map.set(r.team_id, new Set());
    map.get(r.team_id).add(r.user_id);
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

  // Chỉ chặn nếu thiếu Supabase (cần cho mọi bước dưới). Thiếu riêng Web Push hay riêng FCM
  // không chặn toàn bộ — sendToUserIds/sendFcmDataToUserIds tự no-op nếu kênh đó chưa sẵn sàng.
  if (!supabaseAdmin) {
    return Response.json({ error: "Supabase chưa cấu hình" }, { status: 503 });
  }

  // 1) Lấy toàn bộ trận của MỌI giải đang có phòng (rooms.league_id) — mỗi phòng có thể là
  // 1 giải khác nhau, match_id là id gốc FotMob nên gộp trực tiếp an toàn.
  let matches = [];
  try {
    const { data: rooms } = await supabaseAdmin.from("rooms").select("league_id");
    const leagueIds = [...new Set((rooms || []).map((r) => r.league_id || 77))];
    if (!leagueIds.length) leagueIds.push(77);
    const lists = await Promise.all(
      leagueIds.map((id) => fetchLeagueMatchesForPredict(id).catch(() => []))
    );
    matches = lists.flat();
  } catch {
    return Response.json({ error: "Không tải được lịch trận" }, { status: 502 });
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
  const liveMatches = []; // đang đá → tick live-update (mọi lần chạy, không chỉ khi có bàn)
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

    // --- Đang đá: tick live-update (cho app native — kiểu iOS Live Activity) ---
    if (isLive(m.status) && home != null && away != null) {
      liveMatches.push(m);
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

  // 3) Map bettors cho các trận cần nhắm người (kickoff + finished + đang đá)
  const targetedIds = [
    ...new Set([...kickoffMatches, ...finishedMatches, ...liveMatches].map((m) => m.id)),
  ];
  const bettors = await bettorsByMatch(targetedIds);

  // Người theo dõi (follow) 1 trong 2 đội của các trận đang đá/vừa kết thúc — nhận live-update
  // dù không cược (kể cả tick FINISHED để đóng notification đang chạy trên máy họ).
  const liveTeamIds = [
    ...new Set(
      [...liveMatches, ...finishedMatches]
        .flatMap((m) => [m.homeTeam?.id, m.awayTeam?.id])
        .filter(Boolean)
        .map(String)
    ),
  ];
  const followers = await followersByTeam(liveTeamIds);

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

  // Live-update (kiểu iOS Live Activity) → tick mỗi lần cron chạy cho người có kèo pending ở
  // trận đang đá, KHÔNG chỉ khi có bàn thắng. Data-only (không alert) — native Android tự vẽ
  // notification ProgressStyle. Phút thi đấu: ưu tiên phút thật từ FotMob (matchDetails),
  // ước lượng theo thời gian trôi qua từ giờ bóng lăn nếu gọi FotMob lỗi.
  for (const m of liveMatches) {
    const list = bettors.get(m.id) || [];
    const followerIds = [
      ...(followers.get(String(m.homeTeam?.id)) || []),
      ...(followers.get(String(m.awayTeam?.id)) || []),
    ];
    const userIds = [...new Set([...list.map((b) => b.userId), ...followerIds])];
    if (!userIds.length) continue;
    const h = m.score?.fullTime?.home ?? 0;
    const a = m.score?.fullTime?.away ?? 0;
    const elapsedMin = Math.max(0, Math.floor((now - new Date(m.utcDate).getTime()) / 60000));
    let minute = Math.min(90, elapsedMin);
    let halftime = false;
    let scorerFields = {};
    try {
      const detail = await fotmobMatchDetailById(m.id);
      const liveMinuteRaw = detail?.liveMinute;
      if (liveMinuteRaw === "HT") {
        // Nghỉ giữa hiệp: đồng hồ trận đấu ĐỨNG YÊN ở 45, không dùng elapsedMin (thời gian
        // thực trôi qua) vì nó vẫn tăng suốt giờ nghỉ → hiện phút sai (vd "63'" khi đang nghỉ).
        halftime = true;
        minute = 45;
      } else {
        // Chỉ lấy phần SỐ Ở ĐẦU chuỗi (vd "45+2" -> 45) — trước đây strip hết ký tự không phải
        // số làm dính liền số bù giờ ("45+2" -> "452"), ra phút sai lệch hẳn.
        const parsedMinute = parseInt(String(liveMinuteRaw || "").match(/^\d+/)?.[0] || "", 10);
        if (!isNaN(parsedMinute)) minute = Math.min(90, parsedMinute);
      }
      const goals = (detail?.events || []).filter((e) => e.type === "Goal");
      if (goals.length) {
        // events đã sắp theo thứ tự diễn ra → phần tử cuối là bàn MỚI NHẤT.
        const latest = goals[goals.length - 1];
        scorerFields = {
          scorer: latest.player || "",
          scorerMinute: latest.minute != null ? String(latest.minute) : "",
        };
      }
    } catch {
      // Không chặn luồng chính — thiếu scorer/phút thật thì dùng phút ước lượng, không có scorer.
    }
    tasks.push(
      sendFcmDataToUserIds(userIds, {
        liveMatch: "1",
        matchId: String(m.id),
        home: m.homeTeam?.name || "?",
        away: m.awayTeam?.name || "?",
        homeScore: String(h),
        awayScore: String(a),
        minute: String(minute),
        status: halftime ? "HALFTIME" : "LIVE",
        ...(m.homeTeam?.id ? { homeId: String(m.homeTeam.id) } : {}),
        ...(m.awayTeam?.id ? { awayId: String(m.awayTeam.id) } : {}),
        ...(teamLogo(m.homeTeam?.id) ? { homeLogo: teamLogo(m.homeTeam.id) } : {}),
        ...(teamLogo(m.awayTeam?.id) ? { awayLogo: teamLogo(m.awayTeam.id) } : {}),
        ...scorerFields,
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
    const finishedUserIds = [...new Set(list.map((b) => b.userId))];
    const finishedFollowerIds = [
      ...(followers.get(String(m.homeTeam?.id)) || []),
      ...(followers.get(String(m.awayTeam?.id)) || []),
    ];
    // Tick live-update LẦN CUỐI với status FINISHED → native tự đóng notification đang chạy
    // (gồm cả người chỉ follow đội, không cược, để họ không bị kẹt notification "đang đá" mãi).
    tasks.push(
      sendFcmDataToUserIds([...new Set([...finishedUserIds, ...finishedFollowerIds])], {
        liveMatch: "1",
        matchId: String(m.id),
        home: m.homeTeam?.name || "?",
        away: m.awayTeam?.name || "?",
        homeScore: String(h),
        awayScore: String(a),
        minute: "90",
        status: "FINISHED",
        ...(m.homeTeam?.id ? { homeId: String(m.homeTeam.id) } : {}),
        ...(m.awayTeam?.id ? { awayId: String(m.awayTeam.id) } : {}),
        ...(teamLogo(m.homeTeam?.id) ? { homeLogo: teamLogo(m.homeTeam.id) } : {}),
        ...(teamLogo(m.awayTeam?.id) ? { awayLogo: teamLogo(m.awayTeam.id) } : {}),
      })
    );
    for (const b of list) {
      const { status, profitMult } = evaluateBet(b, h, a, { homeTeam: m.homeTeam?.name, awayTeam: m.awayTeam?.name });
      let body;
      if (status === "won_exact") {
        body = `🎯 ${label} — Bạn đoán ĐÚNG TỈ SỐ! +${b.wager * profitMult} 💎`;
      } else if (status !== "lost") {
        body = `✅ ${label} — Thắng kèo (${betLabel(b)})! +${b.wager * profitMult} 💎`;
      } else {
        body = `😢 ${label} — Thua kèo (${betLabel(b)}). -${b.wager} 💎`;
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
    live: liveMatches.length,
  });
}
