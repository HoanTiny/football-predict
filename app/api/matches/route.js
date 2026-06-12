// Proxy phía server cho football-data.org — tránh bị chặn CORS khi gọi từ trình duyệt.
// Token lấy từ header client gửi lên, hoặc fallback biến môi trường FOOTBALL_DATA_TOKEN.

export async function GET(request) {
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
  } catch (e) {
    return Response.json(
      { error: "Không kết nối được football-data.org" },
      { status: 502 }
    );
  }
}
