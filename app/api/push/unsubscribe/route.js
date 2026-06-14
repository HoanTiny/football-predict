import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Xoá một push subscription theo endpoint.
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

  const endpoint = body?.endpoint;
  if (!endpoint) {
    return Response.json({ error: "Thiếu endpoint" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
