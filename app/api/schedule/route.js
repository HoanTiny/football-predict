// Lịch + kết quả TẤT CẢ giải trong 1 ngày (trang "Hôm nay" kiểu FotMob/Apple Sports).
import { fotmobDailySchedule } from "@/lib/fotmob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // "YYYYMMDD", client tự tính theo giờ máy
  if (!date || !/^\d{8}$/.test(date)) {
    return Response.json(
      { error: "Thiếu hoặc sai định dạng tham số date (YYYYMMDD)" },
      { status: 400 }
    );
  }
  const data = await fotmobDailySchedule(date);
  return Response.json(data);
}
