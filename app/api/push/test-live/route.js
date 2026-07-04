import { sendFcmDataToAll } from "@/lib/pushFcm";
import { teamLogo } from "@/lib/leagues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FotMob team id thật (đã xác minh logo trả 200) — dùng làm mặc định cho payload test.
const DEMO_HOME_ID = 5894; // Việt Nam
const DEMO_AWAY_ID = 5788; // Thái Lan

// Gửi 1 live-update GIẢ (kiểu iOS Live Activity) tới TẤT CẢ app native đã đăng ký FCM —
// để test LiveMatchMessagingService mà không cần đợi trận thật. Chỉ dùng lúc dev/test.
//
// Cách gọi (dán thẳng vào trình duyệt):
//   /api/push/test-live?secret=<CRON_SECRET>                            → tick "đang đá" phút 23
//   /api/push/test-live?secret=<CRON_SECRET>&minute=88                   → tuỳ chỉnh phút
//   /api/push/test-live?secret=<CRON_SECRET>&status=FINISHED             → test tự đóng khi kết thúc
//   /api/push/test-live?secret=<CRON_SECRET>&status=HALFTIME             → test hiện "Nghỉ giữa hiệp"
//   /api/push/test-live?secret=<CRON_SECRET>&homeScorer=Công+Phượng&homeScorerMinute=45 → đội nhà ghi bàn
//   /api/push/test-live?secret=<CRON_SECRET>&awayScorer=Messi&awayScorerMinute=60 → đội khách ghi bàn (test cả 2 đội cùng lúc)
//
// Chấp nhận secret qua query param (không chỉ header Bearer) để test thẳng bằng URL trên
// trình duyệt cho tiện — đây là route test, rủi ro thấp (chỉ bắn thông báo tỉ số giả).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const querySecret = searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && querySecret !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const statusParam = searchParams.get("status");
  const status = statusParam === "FINISHED" || statusParam === "HALFTIME" ? statusParam : "LIVE";
  const homeId = searchParams.get("homeId") || String(DEMO_HOME_ID);
  const awayId = searchParams.get("awayId") || String(DEMO_AWAY_ID);
  const data = {
    liveMatch: "1",
    matchId: searchParams.get("matchId") || "999999",
    home: searchParams.get("home") || "Việt Nam",
    away: searchParams.get("away") || "Thái Lan",
    homeScore: searchParams.get("homeScore") || "1",
    awayScore: searchParams.get("awayScore") || "0",
    minute: searchParams.get("minute") || (status === "FINISHED" ? "90" : status === "HALFTIME" ? "45" : "23"),
    status,
    homeId,
    awayId,
    homeLogo: searchParams.get("homeLogo") || teamLogo(homeId),
    awayLogo: searchParams.get("awayLogo") || teamLogo(awayId),
    // Mặc định có sẵn bàn thắng giả của đội nhà để test hiển thị người ghi bàn ngay — truyền
    // &homeScorer= rỗng nếu muốn test trường hợp đội nhà KHÔNG ghi bàn. Muốn test CẢ 2 đội cùng
    // ghi bàn thì truyền thêm &awayScorer=...&awayScorerMinute=....
    homeScorer: searchParams.has("homeScorer") ? searchParams.get("homeScorer") : "Nguyễn Văn Toàn",
    homeScorerMinute: searchParams.get("homeScorerMinute") || "12",
    ...(searchParams.get("awayScorer")
      ? {
          awayScorer: searchParams.get("awayScorer"),
          awayScorerMinute: searchParams.get("awayScorerMinute") || "",
        }
      : {}),
  };

  await sendFcmDataToAll(data);
  return Response.json({ ok: true, sent: data });
}
