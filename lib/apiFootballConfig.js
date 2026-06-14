// Cấu hình nhà cung cấp API-Football dùng chung cho cả thống kê & nguồn trận.
// Mặc định gọi THẲNG api-sports.io (đăng ký tại dashboard.api-football.com).
// Đặt APIFOOTBALL_PROVIDER=rapidapi nếu key của bạn lấy từ RapidAPI.
//
// Key: ưu tiên APIFOOTBALL_KEY, fallback RAPIDAPI_KEY (để không phải đổi env cũ).

const USE_RAPIDAPI = process.env.APIFOOTBALL_PROVIDER === "rapidapi";

export const AF_KEY = process.env.APIFOOTBALL_KEY || process.env.RAPIDAPI_KEY || "";

export const AF_BASE = USE_RAPIDAPI
  ? "https://api-football-v1.p.rapidapi.com/v3"
  : "https://v3.football.api-sports.io";

export const AF_HEADERS = USE_RAPIDAPI
  ? { "x-rapidapi-key": AF_KEY, "x-rapidapi-host": "api-football-v1.p.rapidapi.com" }
  : { "x-apisports-key": AF_KEY };

export const afReady = () => Boolean(AF_KEY);

export const AF_PROVIDER = USE_RAPIDAPI ? "rapidapi" : "api-sports";
