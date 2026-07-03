"use client";

/* ============================================================
   APP SHELL — điểm vào của toàn app, thiết kế kiểu Apple Sports:
   - Nút tròn góc PHẢI: dropdown chọn nội dung (Trang chủ / từng giải / game Dự đoán).
   - Nút tròn góc TRÁI: mở overlay SƠ ĐỒ knockout — chỉ hiện với giải cúp (bracket: true).
   Không cổng chặn: ai vào cũng xem được lịch/kết quả ngay.
   ============================================================ */

import { useEffect, useState } from "react";
import { LEAGUES, leagueById, leagueLogo } from "@/lib/leagues";
import { useFavTeams } from "@/hooks/useFavTeams";
import { isNativeApp } from "@/lib/platform";
import HomeTab from "./HomeTab";
import LeagueView from "./leagues/LeagueView";
import BracketTab from "./tabs/BracketTab";
import WC2026App from "./WC2026App";
import SearchLeagues from "./SearchLeagues";
import MyTeamsView from "./MyTeamsView";
import NewsView from "./NewsView";
import MatchDetailSheet from "./leagues/MatchDetailSheet";

const LS_TOP_TAB = "wc2026_top_tab";

// selection: "home" | "predict" | "search" | "myteams" | "news" | "league:<id>"
function initialSelection() {
  if (typeof window === "undefined") return "home";
  const saved = localStorage.getItem(LS_TOP_TAB);
  if (saved === "home" || saved === "predict" || saved === "search" || saved === "myteams" || saved === "news") return saved;
  if (saved?.startsWith("league:") && leagueById(saved.slice(7))) return saved;
  return "home";
}

const LeagueLogoImg = ({ id, name, className = "w-5 h-5" }) => {
  const [err, setErr] = useState(false);
  if (err) return <span className="text-sm shrink-0">🏆</span>;
  return (
    <img
      src={leagueLogo(id)}
      alt={name}
      onError={() => setErr(true)}
      className={`${className} object-contain shrink-0`}
    />
  );
};

const hexToRgb = (hex) => {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return isNaN(n) ? { r: 91, g: 107, b: 255 } : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
// Pha 2 màu hex theo trọng số w (0-1, w=1 -> hoàn toàn màu a).
const mixHex = (a, b, w) => {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca.r * w + cb.r * (1 - w));
  const g = Math.round(ca.g * w + cb.g * (1 - w));
  const bl = Math.round(ca.b * w + cb.b * (1 - w));
  return `rgb(${r}, ${g}, ${bl})`;
};
const rgba = (hex, a) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Nền "liquid glass" cho khu vực xem bóng đá — mỗi giải pha thêm màu thương hiệu riêng
 * (`accent` trong lib/leagues.js) vào dải gradient + quả cầu glow đầu tiên, để mỗi giải có
 * sắc thái riêng nhưng vẫn cùng "họ" liquid-glass (không đổi hẳn tông, tránh chói/lệch giao diện).
 */
function LiquidGlassBg({ accent }) {
  const topStop = accent ? mixHex(accent, "#4a51b8", 0.55) : "#4a51b8";
  const blob1 = accent ? rgba(accent, 0.4) : "rgba(116, 132, 255, 0.35)";
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden" style={{ background: `linear-gradient(165deg, ${topStop} 0%, #383e9c 45%, #23265c 100%)` }}>
      <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full blur-[110px]" style={{ background: blob1 }} />
      <div className="absolute -top-16 right-[-120px] w-[420px] h-[420px] rounded-full bg-[#6fe0ff]/20 blur-[100px]" />
      <div className="absolute bottom-[-160px] left-1/3 w-[520px] h-[520px] rounded-full bg-[#9a63ff]/20 blur-[130px]" />
    </div>
  );
}

export default function AppShell() {
  const [selection, setSelectionRaw] = useState(initialSelection);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);

  const setSelection = (s) => {
    localStorage.setItem(LS_TOP_TAB, s);
    setSelectionRaw(s);
    setPickerOpen(false);
    setBracketOpen(false);
  };

  const { teams: favTeams } = useFavTeams();

  // Giải đang xem (null nếu đang ở Trang chủ)
  const league = selection.startsWith("league:") ? leagueById(selection.slice(7)) : null;

  // Mở thẳng modal chi tiết 1 trận (ở tab bất kỳ, mặc định "Diễn biến") khi bấm vào notification
  // live-update — data đủ dùng lấy thẳng từ payload FCM, không cần biết trận thuộc giải nào.
  const [deepLinkMatch, setDeepLinkMatch] = useState(null);
  useEffect(() => {
    if (!isNativeApp()) return;
    let listenerHandle;
    (async () => {
      const { App } = await import("@capacitor/app");
      listenerHandle = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const parsed = new URL(url);
          if (parsed.hostname !== "match") return;
          const id = parsed.searchParams.get("id");
          if (!id) return;
          setDeepLinkMatch({
            stub: {
              id,
              home: {
                id: parsed.searchParams.get("homeId") || null,
                name: parsed.searchParams.get("home") || "?",
                score: Number(parsed.searchParams.get("homeScore") || 0),
              },
              away: {
                id: parsed.searchParams.get("awayId") || null,
                name: parsed.searchParams.get("away") || "?",
                score: Number(parsed.searchParams.get("awayScore") || 0),
              },
              utcTime: new Date().toISOString(),
              started: true,
              finished: false,
              cancelled: false,
            },
            tab: parsed.searchParams.get("tab") || "lineup",
          });
        } catch {
          /* URL không hợp lệ — bỏ qua */
        }
      });
    })();
    return () => listenerHandle?.remove();
  }, []);

  const deepLinkOverlay = deepLinkMatch && (
    <MatchDetailSheet
      match={deepLinkMatch.stub}
      initialTab={deepLinkMatch.tab}
      onClose={() => setDeepLinkMatch(null)}
    />
  );

  // Tab Dự đoán = game cũ đầy đủ (đăng nhập/phòng/kèo) — có nút thoát về đây.
  if (selection === "predict") {
    return (
      <>
        <WC2026App onExit={() => setSelection("home")} />
        {deepLinkOverlay}
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-10">
      <LiquidGlassBg accent={league?.accent} />

      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-2xl bg-white/[0.04]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Trái: nút sơ đồ knockout (chỉ giải cúp) + logo app */}
          <div className="flex items-center gap-2.5 shrink-0">
            {league?.bracket && (
              <button
                onClick={() => setBracketOpen(true)}
                title="Sơ đồ knockout"
                aria-label="Sơ đồ knockout"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/25 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] text-white hover:bg-white/25 transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M4 5h5v4H4zM4 15h5v4H4zM15 10h5v4h-5zM9 7h3v10H9M12 12h3" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <img src="/logo.png" alt="Tiny Football" className="h-7 w-auto object-contain" />
            <span className="hidden sm:inline text-xs font-extrabold tracking-[0.15em] uppercase text-white">
              Tiny Football
            </span>
          </div>

          {/* Phải: nút chọn nội dung (dropdown kiểu Apple Sports) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
              title="Chọn giải đấu"
              className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-colors cursor-pointer ${
                pickerOpen ? "bg-white/30 border-white/40" : "bg-white/15 border-white/25 hover:bg-white/25"
              }`}
            >
              {league ? (
                <LeagueLogoImg id={league.id} name={league.name} className="w-6 h-6" />
              ) : (
                <span className="text-base">📅</span>
              )}
            </button>

            {pickerOpen && (
              <>
                {/* Click-outside backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                {/* Dropdown */}
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 z-50 rounded-3xl border border-white/20 shadow-2xl p-1.5 origin-top-right backdrop-blur-2xl bg-[#1c2064]/85 max-h-[70vh] overflow-y-auto"
                >
                  <button
                    role="menuitem"
                    onClick={() => setSelection("search")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                      selection === "search"
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="w-6 text-center">🔍</span> Tìm kiếm
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => setSelection("home")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                      selection === "home"
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="w-6 text-center">🏠</span> Trang chủ
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => setSelection("myteams")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                      selection === "myteams"
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="w-6 text-center">⭐</span> Đội của tôi
                    {favTeams.length > 0 && (
                      <span className="ml-auto text-[9px] text-slate-400 font-bold">{favTeams.length}</span>
                    )}
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => setSelection("news")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                      selection === "news"
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="w-6 text-center">📰</span> Tin tức
                  </button>

                  <div className="my-1.5 border-t border-white/10" />
                  <div className="px-3 pt-1 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Giải đấu
                  </div>
                  {LEAGUES.map((l) => {
                    const active = league && String(league.id) === String(l.id);
                    return (
                      <button
                        key={l.id}
                        role="menuitem"
                        onClick={() => setSelection(`league:${l.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? "bg-white/20 text-white"
                            : "text-slate-200 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="w-6 flex justify-center">
                          <LeagueLogoImg id={l.id} name={l.name} />
                        </span>
                        <span className="truncate">{l.name}</span>
                        {l.bracket && (
                          <span className="ml-auto text-[9px] text-slate-400 font-bold uppercase">Cúp</span>
                        )}
                      </button>
                    );
                  })}

                  <div className="my-1.5 border-t border-white/10" />
                  <button
                    role="menuitem"
                    onClick={() => setSelection("predict")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold text-[#62F2C0] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <span className="w-6 text-center">🎮</span> Game Dự đoán
                    <span className="ml-auto text-slate-400 text-xs">→</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-5">
        {league ? (
          <LeagueView key={league.id} league={league} />
        ) : selection === "search" ? (
          <SearchLeagues
            onSelectLeague={(l) => setSelection(`league:${l.id}`)}
            onClose={() => setSelection("home")}
          />
        ) : selection === "myteams" ? (
          <MyTeamsView onClose={() => setSelection("home")} />
        ) : selection === "news" ? (
          <NewsView onClose={() => setSelection("home")} />
        ) : (
          <HomeTab />
        )}
      </main>

      {/* Overlay SƠ ĐỒ knockout — full màn hình, kiểu Apple Sports (ảnh bracket) */}
      {bracketOpen && league?.bracket && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <LiquidGlassBg accent={league?.accent} />
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 border-b border-white/10 backdrop-blur-2xl bg-white/[0.04]"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <button
              onClick={() => setBracketOpen(false)}
              aria-label="Đóng sơ đồ"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/25 backdrop-blur-xl text-white hover:bg-white/25 transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-2">
              <LeagueLogoImg id={league.id} name={league.name} className="w-6 h-6" />
              <span className="text-sm font-bold text-white">{league.name}</span>
            </div>
            <span className="w-10" />
          </div>
          <div className="max-w-[1600px] mx-auto px-4 py-5">
            <BracketTab matches={[]} leagueId={league.id} leagueName={league.name} />
          </div>
        </div>
      )}

      {deepLinkOverlay}
    </div>
  );
}
