import { fotmobBracket } from "@/lib/fotmob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sơ đồ knockout từ FotMob ("as it stands"). Lỗi/thiếu → trả hasData:false để client
// tự fallback về bracket dựng từ football-data (organizeBracket).
export async function GET() {
  const bracket = await fotmobBracket();
  return Response.json(bracket);
}
