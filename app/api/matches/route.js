// Nguồn danh sách trận. Ưu tiên API-Football (live tốt: HT/phút/cập nhật ~15s)
// khi có RAPIDAPI_KEY; nếu không có key hoặc lỗi thì fallback football-data.org.
import { wcSourceReady, fetchWorldCupMatches } from "@/lib/wcMatches";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // 1) Ưu tiên API-Football
  if (wcSourceReady()) {
    try {
      const matches = await fetchWorldCupMatches();
      if (matches && matches.length) {
        return Response.json({ matches, source: "api-football" });
      }
    } catch {
      // rơi xuống fallback football-data
    }
  }

  // 2) Fallback: football-data.org (token từ client header hoặc env)
  const token =
    request.headers.get("x-auth-token") || process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return Response.json({ error: "Missing API token" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      {
        headers: { "X-Auth-Token": token },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return Response.json(
        { error: `football-data.org trả về HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "Không kết nối được football-data.org" },
      { status: 502 }
    );
  }
}
