// Tin tức bóng đá trong ngày (RSS VnExpress, xem lib/news.js).
import { fetchFootballNews } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  const news = await fetchFootballNews();
  return Response.json({ news });
}
