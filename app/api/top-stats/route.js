import { fotmobTopStats } from "@/lib/fotmob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả cả 2 hạng mục cùng lúc — client chỉ cần 1 fetch để render 2 tab.
// FotMob key: goals = ghi bàn · goal_assist = kiến tạo.
export async function GET() {
  const [scorers, assists] = await Promise.all([
    fotmobTopStats("goals"),
    fotmobTopStats("goal_assist"),
  ]);
  return Response.json({ scorers, assists });
}
