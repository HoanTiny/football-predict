import { sendFcmDataToAll } from "@/lib/pushFcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gửi 1 live-update GIẢ (kiểu iOS Live Activity) tới TẤT CẢ app native đã đăng ký FCM —
// để test LiveMatchMessagingService mà không cần đợi trận thật. Chỉ dùng lúc dev/test.
//
// Cách gọi (dán thẳng vào trình duyệt):
//   /api/push/test-live?secret=<CRON_SECRET>                     → tick "đang đá" phút 23
//   /api/push/test-live?secret=<CRON_SECRET>&minute=88            → tuỳ chỉnh phút
//   /api/push/test-live?secret=<CRON_SECRET>&status=FINISHED      → test tự đóng khi kết thúc
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

  const status = searchParams.get("status") === "FINISHED" ? "FINISHED" : "LIVE";
  const data = {
    liveMatch: "1",
    matchId: searchParams.get("matchId") || "999999",
    home: searchParams.get("home") || "Việt Nam",
    away: searchParams.get("away") || "Thái Lan",
    homeScore: searchParams.get("homeScore") || "1",
    awayScore: searchParams.get("awayScore") || "0",
    minute: searchParams.get("minute") || (status === "FINISHED" ? "90" : "23"),
    status,
  };

  await sendFcmDataToAll(data);
  return Response.json({ ok: true, sent: data });
}
