"use client";

/* ============================================================
   WORLD CUP 2026 — GAME DỰ ĐOÁN
   Component gốc: quản lý chế độ chơi (một mình / theo phòng),
   state chung và ghép các màn hình/tab.
   ============================================================ */

import { useState, useMemo, useEffect } from "react";
import { LS_TOKEN, LS_DEMO, LS_MODE, LS_ROOM_CODE, LS_ROOM_PLAYER_ID, LS_ROOM_SESSIONS, LS_ROOM_ACTIVE, START_CHIPS, fmt } from "@/lib/constants";
import { useToasts } from "@/hooks/useToasts";
import { useLocalStore } from "@/hooks/useLocalStore";
import { useRoomStore } from "@/hooks/useRoomStore";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useMatches } from "@/hooks/useMatches";
import { createRoom, joinRoom } from "@/lib/roomApi";
import { supabaseReady, supabase } from "@/lib/supabase";

/** Các tab hợp lệ — dùng để sync tab hiện tại với URL hash (#predictions, #leaderboard…). */
const VALID_TABS = ["schedule", "groups", "bracket", "predictions", "leaderboard", "statistics", "champion", "settings"];

/** Đọc tab từ URL hash, fallback về "schedule" nếu hash không hợp lệ. */
function tabFromHash() {
  const h = window.location.hash.replace("#", "");
  return VALID_TABS.includes(h) ? h : "schedule";
}

/** Đọc danh sách phòng đã tham gia từ localStorage (kèm migrate từ phiên đơn cũ). */
function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_ROOM_SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  const code = localStorage.getItem(LS_ROOM_CODE);
  const playerId = localStorage.getItem(LS_ROOM_PLAYER_ID);
  if (code && playerId) {
    const list = [{ code, playerId, name: "" }];
    localStorage.setItem(LS_ROOM_SESSIONS, JSON.stringify(list));
    return list;
  }
  return [];
}

import ConfigScreen from "./ConfigScreen";
import RoomScreen from "./RoomScreen";
import OnboardingModal from "./OnboardingModal";
import Header from "./Header";
import BottomNav from "./BottomNav";
import BetModal from "./BetModal";
import ChatWidget from "./ChatWidget";
import Toasts from "./Toasts";
import ScheduleTab from "./tabs/ScheduleTab";
import GroupsTab from "./tabs/GroupsTab";
import BracketTab from "./tabs/BracketTab";
import PredictionsTab from "./tabs/PredictionsTab";
import LeaderboardTab from "./tabs/LeaderboardTab";
import ChampionTab from "./tabs/ChampionTab";
import SettingsTab from "./tabs/SettingsTab";
import StatisticsTab from "./tabs/StatisticsTab";
import LeaderboardSidebar from "./LeaderboardSidebar";

export default function WC2026App() {
  const [authSession, setAuthSession] = useState(null);

  useEffect(() => {
    if (!supabaseReady) return;

    const syncRooms = async (userId) => {
      if (!userId) return;
      try {
        const { fetchUserRooms } = await import("@/lib/roomApi");
        const rooms = await fetchUserRooms(userId);
        if (rooms && rooms.length > 0) {
          localStorage.setItem(LS_ROOM_SESSIONS, JSON.stringify(rooms));
          setSessionsRaw(rooms);
          const active = localStorage.getItem(LS_ROOM_ACTIVE) || rooms[0].code;
          localStorage.setItem(LS_ROOM_ACTIVE, active);
          setActiveCodeRaw(active);
          localStorage.setItem(LS_MODE, "room");
          setModeRaw("room");
        }
      } catch (e) {
        console.error("Failed to sync user rooms:", e);
      }
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setAuthSession(s);
      if (s?.user?.id) {
        syncRooms(s.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setAuthSession(s);
      if (event === "SIGNED_OUT") {
        // Clear all room-related localStorage items and state to avoid hanging on RLS blocks
        localStorage.removeItem(LS_ROOM_SESSIONS);
        localStorage.removeItem(LS_ROOM_ACTIVE);
        localStorage.removeItem(LS_ROOM_CODE);
        localStorage.removeItem(LS_ROOM_PLAYER_ID);
        localStorage.removeItem(LS_MODE); // Remove mode so app redirects to onboarding

        setSessionsRaw([]);
        setActiveCodeRaw(null);
        setModeRaw(null);
        setForceRoomPicker(false);
      } else if (event === "SIGNED_IN" && s?.user?.id) {
        syncRooms(s.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Token cá nhân (tuỳ chọn) lưu cục bộ. KHÔNG dùng token public (tránh lộ key).
  const [apiToken, setApiToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_TOKEN) || "";
    }
    return "";
  });
  // Server đã cấu hình FOOTBALL_DATA_TOKEN? (chỉ là cờ boolean, không lộ token)
  const hasServerToken = process.env.NEXT_PUBLIC_HAS_SERVER_TOKEN === "true";
  const [demoMode, setDemoModeRaw] = useState(() => localStorage.getItem(LS_DEMO) === "1");
  const setDemoMode = (v) => {
    localStorage.setItem(LS_DEMO, v ? "1" : "0");
    setDemoModeRaw(v);
  };


  // Chế độ chơi: 'solo' | 'room' | null (chưa chọn)
  const [mode, setModeRaw] = useState(() => localStorage.getItem(LS_MODE) || null);
  const setMode = (m) => {
    if (m) localStorage.setItem(LS_MODE, m);
    else localStorage.removeItem(LS_MODE);
    setModeRaw(m);
  };

  // Danh sách phòng đã tham gia (đa phòng) + phòng đang mở
  const [sessions, setSessionsRaw] = useState(loadSessions);
  const [activeCode, setActiveCodeRaw] = useState(
    () => localStorage.getItem(LS_ROOM_ACTIVE) || sessions[0]?.code || null
  );
  const persistSessions = (list) => {
    localStorage.setItem(LS_ROOM_SESSIONS, JSON.stringify(list));
    setSessionsRaw(list);
  };
  const setActiveCode = (code) => {
    if (code) localStorage.setItem(LS_ROOM_ACTIVE, code);
    else localStorage.removeItem(LS_ROOM_ACTIVE);
    setActiveCodeRaw(code);
  };
  const session = useMemo(
    () => sessions.find((s) => s.code === activeCode) || sessions[0] || null,
    [sessions, activeCode]
  );

  // Buộc hiện màn chọn/tạo phòng (khi đang ở phòng mà muốn vào/tạo phòng khác)
  const [forceRoomPicker, setForceRoomPicker] = useState(false);

  // Link mời ?room=CODE → vào thẳng form nhập tên
  const inviteCode = useMemo(() => {
    const c = new URLSearchParams(window.location.search).get("room");
    return c ? c.toUpperCase() : null;
  }, []);

  // Tab hiện tại sync với URL hash → F5 giữ nguyên tab, back/forward hoạt động
  const [tab, setTabRaw] = useState(tabFromHash);
  const setTab = (t) => {
    setTabRaw(t);
    if (window.location.hash !== `#${t}`) window.location.hash = t;
  };
  useEffect(() => {
    const onHashChange = () => setTabRaw(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [betMatch, setBetMatch] = useState(null);
  const [betModalTab, setBetModalTab] = useState("predict");

  const handleBet = (match, initialTab = "predict") => {
    setBetMatch(match);
    setBetModalTab(initialTab);
  };

  const { toasts, pushToast } = useToasts();
  const { matches, loading, error, lastUpdated, fetchMatches } = useMatches(apiToken, demoMode, hasServerToken);

  const inRoom = mode === "room" && session;
  const local = useLocalStore(inRoom ? [] : matches, pushToast);
  const room = useRoomStore(inRoom ? session : null, matches, pushToast);

  const store = inRoom ? room : local;
  const player = store.player;

  // Chat realtime theo phòng (chỉ hoạt động khi đang trong phòng & đã đăng nhập)
  const chat = useRoomChat(
    inRoom ? session : null,
    authSession?.user?.id,
    player?.playerName,
    pushToast
  );

  // Số người đang online trong phòng (Supabase Presence)
  const onlinePlayers = useRoomPresence(
    inRoom ? session : null,
    authSession?.user?.id,
    player?.playerName
  );

  /* ----- actions ----- */

  const saveToken = (t) => {
    localStorage.setItem(LS_TOKEN, t);
    setApiToken(t);
    setDemoMode(false);
  };

  const joinedRoom = (code, me) => {
    const next = [
      ...sessions.filter((s) => s.code !== code),
      { code, playerId: me.id, name: me.name },
    ];
    persistSessions(next);
    setActiveCode(code);
    setMode("room");
    setForceRoomPicker(false);
    pushToast(`🏟️ Đã vào phòng ${code}. Rủ thêm bạn bè bằng nút chia sẻ link nhé!`, "win");
  };

  // Chuyển sang một phòng đã tham gia khác
  const switchRoom = (code) => {
    if (!sessions.some((s) => s.code === code)) return;
    setActiveCode(code);
    setMode("room");
    setForceRoomPicker(false);
  };

  // Về chế độ chơi một mình (vẫn giữ danh sách phòng đã tham gia)
  const goSolo = () => {
    setMode("solo");
    setForceRoomPicker(false);
  };

  const goViewer = () => {
    setMode("viewer");
    setForceRoomPicker(false);
    setTab("schedule");
  };

  // Rời một phòng (mặc định phòng đang mở).
  // SOFT-LEAVE: chỉ gỡ phòng khỏi thiết bị này, KHÔNG xoá dữ liệu trên server.
  // Nhờ vậy chip + lịch sử kèo được giữ nguyên và sẽ khôi phục khi vào lại phòng.
  const leaveRoom = (code = activeCode) => {
    const actualCode = (code && typeof code === "string") ? code : activeCode;
    const next = sessions.filter((s) => s.code !== actualCode);
    persistSessions(next);
    if (activeCode === actualCode || !next.some((s) => s.code === activeCode)) {
      if (next.length) {
        setActiveCode(next[0].code);
        setMode("room");
      } else {
        setActiveCode(null);
        setMode("solo");
      }
    }
  };

  // Mở link mời tới phòng đã là thành viên → tự chuyển sang phòng đó (một lần)
  useEffect(() => {
    if (
      inviteCode &&
      sessions.some((s) => s.code === inviteCode) &&
      activeCode !== inviteCode
    ) {
      setActiveCode(inviteCode);
      setMode("room");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode]);

  const placeBet = (bet) => {
    if (!player || bet.wager > player.chips) return;
    store.placeBet(bet);
    setBetMatch(null);
    pushToast(`Đã đặt cược ${bet.homeGoals}-${bet.awayGoals} với ${fmt(bet.wager)} 💎. Chúc may mắn! 🍀`, "info");
  };

  const placeChampionBet = (stage, team, wager, multiplier) => {
    if (!player) return;
    const picks = player.championPicks || [];
    if (picks.some((p) => p.stage === stage)) return;
    const w = Math.max(10, Math.min(wager, player.chips));
    store.placeChampionBet(stage, team, w, multiplier);
    pushToast(`👑 Đã cược ${team} vô địch (×${multiplier}) với ${fmt(w)} 💎!`, "info");
  };

  const resetPredictions = () => {
    if (!demoMode) {
      pushToast("Không thể xoá dự đoán & đặt lại chips khi chơi thật.", "lose");
      return;
    }
    if (!window.confirm(`Xoá toàn bộ dự đoán và đặt lại ${fmt(START_CHIPS)} 💎 chips?`)) return;
    store.reset();
    pushToast(`Đã đặt lại dữ liệu. Bạn có ${fmt(START_CHIPS)} 💎 mới!`, "info");
  };

  const [creatingRoom, setCreatingRoom] = useState(false);

  const copyRoomLink = async (code) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard có thể bị chặn — vẫn coi như đã tạo phòng */
    }
  };

  const shareLink = async () => {
    // Đang trong phòng → copy link phòng để bạn bè vào chung
    if (inRoom) {
      await copyRoomLink(session.code);
      pushToast(`📋 Đã sao chép link mời vào phòng ${session.code}! Gửi cho bạn bè để vào chơi chung.`, "info");
      return;
    }

    // Đang chơi solo → tự tạo phòng mới rồi mời (cần Supabase)
    if (!supabaseReady) {
      pushToast("Chế độ phòng chưa bật (thiếu cấu hình Supabase).", "lose");
      return;
    }
    if (creatingRoom) return;
    setCreatingRoom(true);
    try {
      const name = (player?.playerName || "Người chơi").trim();
      const code = await createRoom();
      const me = await joinRoom(code, name);
      joinedRoom(code, me);
      await copyRoomLink(code);
      pushToast(`🏟️ Đã tạo phòng ${code} & sao chép link mời! Gửi cho bạn bè để cùng chơi.`, "win");
    } catch (e) {
      pushToast(`Không tạo được phòng: ${e.message}`, "lose");
    } finally {
      setCreatingRoom(false);
    }
  };

  /* ----- derived ----- */

  const predictionByMatch = useMemo(() => {
    const m = new Map();
    (player?.predictions || []).forEach((p) => {
      const list = m.get(p.matchId) || [];
      list.push(p);
      m.set(p.matchId, list);
    });
    return m;
  }, [player]);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);


  /* ----- guards ----- */

  // Chỉ buộc nhập token khi server CHƯA có token và người dùng chưa chọn demo.
  if (!apiToken && !demoMode && !hasServerToken) {
    return <ConfigScreen onSave={saveToken} onDemo={() => setDemoMode(true)} />;
  }

  // Màn chọn/tạo/vào phòng:
  //  - chưa chọn chế độ chơi, hoặc
  //  - mở link mời tới phòng CHƯA là thành viên (kể cả khi đang ở phòng khác), hoặc
  //  - người dùng chủ động bấm "vào/tạo phòng khác"
  const fromInvite = Boolean(inviteCode && !sessions.some((s) => s.code === inviteCode));
  if (!mode || fromInvite || forceRoomPicker) {
    return (
      <RoomScreen
        initialCode={fromInvite ? inviteCode : null}
        onJoined={joinedRoom}
        onSolo={goSolo}
        onViewer={goViewer}
        onCancel={
          forceRoomPicker && !fromInvite && mode
            ? () => setForceRoomPicker(false)
            : undefined
        }
        session={authSession}
        pushToast={pushToast}
      />
    );
  }

  // Chế độ xem lịch & cập nhật kết quả — không cần player
  if (mode === "viewer") {
    return (
      <div className="min-h-[100dvh] pb-20">
        {/* Minimal sticky header */}
        <header
          className="fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 gap-3 border-b border-white/5"
          style={{ background: "rgba(8,20,45,0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <span className="text-xs font-black text-white uppercase tracking-wider shrink-0">📅 Lịch &amp; Kết quả</span>
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: "schedule", label: "Lịch" },
              { key: "groups", label: "Bảng" },
              { key: "bracket", label: "Sơ đồ" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === t.key ? "bg-[#334BFF] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMode(null)}
            className="shrink-0 text-[10px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Đổi chế độ
          </button>
        </header>

        <main className="max-w-[1280px] mx-auto px-4 pt-20 pb-6">
          {tab === "schedule" && (
            <ScheduleTab
              matches={matches}
              loading={loading}
              error={error}
              onRetry={() => fetchMatches()}
              predictionByMatch={new Map()}
              onBet={null}
              betsByMatch={null}
            />
          )}
          {tab === "groups" && (
            <GroupsTab matches={matches} predictionByMatch={new Map()} />
          )}
          {tab === "bracket" && <BracketTab matches={matches} />}
        </main>

        {/* Mobile bottom nav — viewer */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/5"
          style={{ background: "rgba(8,20,45,0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", height: "60px" }}
        >
          {[
            { key: "schedule", label: "Lịch", icon: "📅" },
            { key: "groups", label: "Bảng", icon: "📋" },
            { key: "bracket", label: "Sơ đồ", icon: "🗺️" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer"
                style={{ color: active ? "#62F2C0" : "rgba(138,160,200,0.5)" }}
              >
                <span className="text-lg" style={{ transform: active ? "scale(1.1)" : "scale(1)" }}>
                  {t.icon}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider">{t.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMode(null)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer"
            style={{ color: "rgba(138,160,200,0.5)" }}
          >
            <span className="text-lg">🔙</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">Menu</span>
          </button>
        </nav>

        <Toasts toasts={toasts} />
      </div>
    );
  }

  if (inRoom && !player) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)", color: "rgba(200,210,255,0.5)", fontFamily: "var(--font-jakarta)" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🏟️</div>
          <div>Đang vào phòng {session.code}…</div>
        </div>
      </div>
    );
  }
  if (!player) return <OnboardingModal onSubmit={local.createPlayer} />;

  const fullWidth = tab === "bracket" || tab === "groups" || tab === "leaderboard";

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-8">
      <Header
        player={player}
        demoMode={demoMode}
        lastUpdated={lastUpdated}
        tab={tab}
        onTabChange={setTab}
        roomCode={inRoom ? session.code : null}
        sessions={sessions}
        activeCode={inRoom ? activeCode : null}
        isSolo={mode === "solo"}
        onSwitchRoom={switchRoom}
        onGoSolo={goSolo}
        onOpenRoomPicker={() => setForceRoomPicker(true)}
        authSession={authSession}
      />

      <main className={`${fullWidth ? "max-w-[1600px]" : "max-w-[1280px]"} mx-auto px-4 pt-[72px] pb-6`} key={tab}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main content column */}
          <div className={`${fullWidth ? "lg:col-span-12" : "lg:col-span-8"} space-y-6 tab-fade`}>
            {tab === "schedule" && (
              <ScheduleTab
                matches={matches}
                loading={loading}
                error={error}
                onRetry={() => fetchMatches()}
                predictionByMatch={predictionByMatch}
                onBet={handleBet}
                betsByMatch={inRoom ? room.betsByMatch : null}
                onTabChange={setTab}
              />
            )}
            {tab === "groups" && (
              <GroupsTab matches={matches} predictionByMatch={predictionByMatch} />
            )}
            {tab === "bracket" && (
              <BracketTab matches={matches} />
            )}
            {tab === "predictions" && (
              <PredictionsTab
                player={player}
                matchById={matchById}
                onGoSchedule={() => setTab("schedule")}
                betsByMatch={inRoom ? room.betsByMatch : null}
              />
            )}
            {tab === "leaderboard" && (
              <LeaderboardTab player={player} matches={matches} roomLeaderboard={inRoom ? room.leaderboard : null} />
            )}
            {tab === "statistics" && (
              <StatisticsTab player={player} />
            )}
            {tab === "champion" && (
              <ChampionTab player={player} onPlaceBet={placeChampionBet} roomChampions={inRoom ? room.champions : null} matches={matches} />
            )}
            {tab === "settings" && (
              <SettingsTab
                player={player}
                demoMode={demoMode}
                onSwitchPlayer={local.createPlayer}
                onReset={resetPredictions}
                onShare={shareLink}
                roomCode={inRoom ? session.code : null}
                onLeaveRoom={leaveRoom}
                authSession={authSession}
              />
            )}
          </div>

          {/* Sidebar column (desktop only) */}
          {!fullWidth && (
            <aside className="hidden lg:block lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              {tab !== "leaderboard" && (
                <LeaderboardSidebar
                  player={player}
                  matches={matches}
                  roomLeaderboard={inRoom ? room.leaderboard : null}
                />
              )}
            </aside>
          )}
        </div>
      </main>

      <BottomNav tab={tab} onTabChange={setTab} />

      {betMatch && (
        <BetModal
          match={betMatch}
          matches={matches}
          chips={player.chips}
          onConfirm={placeBet}
          onClose={() => setBetMatch(null)}
          prediction={predictionByMatch.get(betMatch.id)}
          roomBets={inRoom ? room.betsByMatch?.get(betMatch.id) : null}
          initialTab={betModalTab}
        />
      )}

      {inRoom && authSession && (
        <ChatWidget
          messages={chat.messages}
          onSend={chat.send}
          myUserId={authSession.user.id}
          roomCode={session.code}
          ready={chat.ready}
          online={onlinePlayers}
          typing={chat.typing}
          onTyping={chat.notifyTyping}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}
