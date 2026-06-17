import { pushReady, sendToAll } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gửi 1 thông báo THỬ tới tất cả subscription — để test pipeline push.
// Bảo vệ bằng CRON_SECRET (tránh ai cũng spam được).
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!pushReady()) {
    return Response.json(
      { error: "Push chưa cấu hình (thiếu VAPID keys hoặc SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 }
    );
  }
  await sendToAll({
    title: "🔔 Tiny Football — Test",
    body: "Thông báo thử thành công! Push đang hoạt động.",
    url: "/",
    tag: "test",
  });
  return Response.json({ ok: true });
}
