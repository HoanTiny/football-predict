import { aiReady, analyzeGroup } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!aiReady()) {
    return Response.json({ error: "Chưa cấu hình ANTHROPIC_API_KEY" }, { status: 503 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body không hợp lệ" }, { status: 400 });
  }
  if (!body?.letter) {
    return Response.json({ error: "Thiếu bảng" }, { status: 400 });
  }
  try {
    const data = await analyzeGroup(body);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message || "Lỗi AI" }, { status: 502 });
  }
}
