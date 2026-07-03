import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lưu (upsert) một FCM token — dùng cho app Android/iOS đóng gói Capacitor.
// Song song với /api/push/subscribe (Web Push) nhưng khác bảng vì khác định dạng.
export async function POST(request) {
  if (!supabaseAdmin) {
    return Response.json({ error: "Push chưa được cấu hình" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const { token, accessToken, platform = "android" } = body || {};
  if (!token) {
    return Response.json({ error: "Thiếu token" }, { status: 400 });
  }

  let userId = null;
  if (accessToken) {
    const { data } = await supabaseAdmin.auth.getUser(accessToken);
    userId = data?.user?.id || null;
  }

  const { error } = await supabaseAdmin.from("fcm_tokens").upsert(
    {
      token,
      user_id: userId,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
