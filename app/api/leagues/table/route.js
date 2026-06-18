// BXH một giải đấu (nguồn FotMob, server-side). ?id=<fotmobLeagueId>
import { fotmobLeagueTable } from "@/lib/fotmobLeagues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing league id" }, { status: 400 });
  const table = await fotmobLeagueTable(id);
  return Response.json(table);
}
