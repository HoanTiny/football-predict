// Toàn văn 1 bài viết Tuổi Trẻ (xem lib/news.js). ?url=<link bài viết từ /api/news>
import { fetchArticleFullText } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !url.startsWith("https://tuoitre.vn/")) {
    return Response.json({ error: "URL không hợp lệ" }, { status: 400 });
  }
  const article = await fetchArticleFullText(url);
  return Response.json(article);
}
