import { fotmobBracket } from "@/lib/fotmob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sơ đồ knockout từ FotMob ("as it stands"). Lỗi/thiếu → trả hasData:false để client
// tự fallback về bracket dựng từ football-data (organizeBracket).
// ?id=<leagueId FotMob> — mặc định World Cup (77); dùng được cho UCL (42), UEL (73)…
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id")) || undefined;
  const bracket = await fotmobBracket(id);
  return Response.json(bracket);
}
