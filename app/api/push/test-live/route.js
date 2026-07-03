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
//   /api/push/test-live?secret=<CRON_SECRET>&scorer=Công+Phượng&scorerMinute=45 → test có người ghi bàn
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
    // Mặc định có sẵn 1 bàn thắng giả để test hiển thị người ghi bàn ngay — truyền
    // &scorer= rỗng nếu muốn test trường hợp KHÔNG có ai ghi bàn.
    scorer: searchParams.has("scorer") ? searchParams.get("scorer") : "Nguyễn Văn Toàn",
    scorerMinute: searchParams.get("scorerMinute") || "12",
  };

  await sendFcmDataToAll(data);
  return Response.json({ ok: true, sent: data });
}
