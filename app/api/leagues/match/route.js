// Chi tiết một trận (đội hình + thống kê + phong độ + H2H) theo matchId FotMob. ?id=<matchId>
import { fotmobMatchDetailById } from "@/lib/fotmob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing match id" }, { status: 400 });
  const detail = await fotmobMatchDetailById(id);
  return Response.json({ ...detail, statsAvailable: !!(detail.lineups || detail.matchStats || detail.h2h.length) });
}
