import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lưu (upsert) một push subscription. Nếu client gửi kèm accessToken hợp lệ,
// gắn user_id để có thể gửi thông báo nhắm đúng người (kèo, kết quả).
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

  const { subscription, accessToken } = body || {};
  if (!subscription?.endpoint) {
    return Response.json({ error: "Thiếu subscription" }, { status: 400 });
  }

  let userId = null;
  if (accessToken) {
    const { data } = await supabaseAdmin.auth.getUser(accessToken);
    userId = data?.user?.id || null;
  }

  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      subscription,
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
