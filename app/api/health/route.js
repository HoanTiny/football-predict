import { AF_BASE, AF_HEADERS, afReady, AF_PROVIDER } from "@/lib/apiFootballConfig";

export const dynamic = "force-dynamic";

// Chẩn đoán cấu hình + GỌI THỬ api-sports để biết: plan (free/pro), số request,
// và gói của bạn có thấy được trận World Cup 2026 không. KHÔNG lộ giá trị secret.
async function afGet(path) {
  try {
    const res = await fetch(AF_BASE + path, { headers: AF_HEADERS, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    return { httpStatus: res.status, json };
  } catch (e) {
    return { httpStatus: 0, error: e.message };
  }
}

export async function GET() {
  const wcLeague = process.env.APIFOOTBALL_WC_LEAGUE || "1";
  const wcSeason = process.env.APIFOOTBALL_WC_SEASON || "2026";

  const out = {
    env: {
      apiFootballKey: Boolean(process.env.APIFOOTBALL_KEY || process.env.RAPIDAPI_KEY),
      footballDataToken: Boolean(process.env.FOOTBALL_DATA_TOKEN),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      vapid: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
      ),
    },
    provider: AF_PROVIDER,
    wcLeague,
    wcSeason,
    apiFootball: null,
    time: new Date().toISOString(),
  };

  if (afReady()) {
    const status = await afGet("/status");
    const sub = status.json?.response?.subscription;
    const req = status.json?.response?.requests;
    const fx = await afGet(`/fixtures?league=${wcLeague}&season=${wcSeason}`);
    out.apiFootball = {
      statusHttp: status.httpStatus,
      plan: sub?.plan ?? null,
      active: sub?.active ?? null,
      requests: req ? `${req.current}/${req.limit_day}` : null,
      // Số trận WC mùa cấu hình mà GÓI của bạn thấy được. 0 = gói không có mùa này.
      wcFixturesFound: Array.isArray(fx.json?.response) ? fx.json.response.length : 0,
      wcErrors:
        fx.json?.errors && Object.keys(fx.json.errors).length ? fx.json.errors : null,
    };
  }

  return Response.json(out);
}
