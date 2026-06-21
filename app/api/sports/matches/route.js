// Trận theo ngày cho Trang chủ "For You" — qua lớp adapter (provider).
// ?date=YYYYMMDD (UTC, mặc định hôm nay) & leagues=47,87,... (lọc theo giải đang theo dõi)
import { provider } from "@/lib/sports/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayUtcKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${da}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayUtcKey();
  const leaguesParam = searchParams.get("leagues");
  const leagueIds = leaguesParam
    ? leaguesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const matches = await provider.getMatchesByDate(date, leagueIds);
  return Response.json({ date, matches });
}
