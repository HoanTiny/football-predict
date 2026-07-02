// Nguồn danh sách trận cho phần Dự đoán — FotMob theo leagueId (không cần API key), CÙNG
// nguồn với phần duyệt trận. Thay cho football-data.org/API-Football cũ (hay lỗi 403/hết quota,
// chỉ hỗ trợ World Cup) để mỗi phòng chơi có thể chọn giải đấu bất kỳ (lib/leagues.js).
import { fetchLeagueMatchesForPredict } from "@/lib/predictMatches";
import { enrichLiveScores } from "@/lib/liveEnrich";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const leagueId = Number(new URL(request.url).searchParams.get("leagueId")) || 77;

  try {
    const matches = await fetchLeagueMatchesForPredict(leagueId);
    if (matches.length) await enrichLiveScores(matches);
    return Response.json({ matches, source: "fotmob" });
  } catch (e) {
    return Response.json(
      { error: e.message || "Không tải được lịch trận" },
      { status: 502 }
    );
  }
}
