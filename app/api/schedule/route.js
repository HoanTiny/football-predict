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

  // Để bù đắp lệch múi giờ (FotMob dùng UTC, Client dùng giờ địa phương):
  // Lấy thêm cả ngày hôm trước và ngày hôm sau rồi gộp lại, client sẽ tự lọc lại chính xác.
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(4, 6), 10) - 1;
  const d = parseInt(date.slice(6, 8), 10);
  
  const targetDate = new Date(Date.UTC(y, m, d));
  
  const yesterday = new Date(targetDate);
  yesterday.setUTCDate(targetDate.getUTCDate() - 1);
  
  const tomorrow = new Date(targetDate);
  tomorrow.setUTCDate(targetDate.getUTCDate() + 1);

  const format = (dt) => {
    const yr = dt.getUTCFullYear();
    const mt = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dy = String(dt.getUTCDate()).padStart(2, "0");
    return `${yr}${mt}${dy}`;
  };

  const datesToFetch = [format(yesterday), date, format(tomorrow)];

  try {
    const results = await Promise.all(datesToFetch.map((d) => fotmobDailySchedule(d)));
    
    // Gộp các giải và các trận đấu theo primaryId
    const mergedLeagues = new Map();
    
    for (const res of results) {
      for (const lg of res.leagues || []) {
        const existing = mergedLeagues.get(lg.id);
        if (!existing) {
          mergedLeagues.set(lg.id, {
            ...lg,
            matches: [...lg.matches],
          });
        } else {
          const seenIds = new Set(existing.matches.map((match) => match.id));
          for (const match of lg.matches || []) {
            if (!seenIds.has(match.id)) {
              existing.matches.push(match);
              seenIds.add(match.id);
            }
          }
        }
      }
    }

    const leagues = [...mergedLeagues.values()].map((lg) => {
      lg.matches.sort((a, b) => new Date(a.utcTime) - new Date(b.utcTime));
      return lg;
    });

    return Response.json({ date, leagues });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
