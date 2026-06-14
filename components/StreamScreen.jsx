"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  LS_TOKEN,
  LS_DEMO,
  LS_MODE,
  LS_ROOM_CODE,
  LS_ROOM_PLAYER_ID,
  flagOf,
  flagImgOf,
} from "@/lib/constants";
import { vnDateHeader, vnTime } from "@/lib/time";
import { calculateGroupStandings, getTeamGroup } from "@/lib/standings";
import { useMatches } from "@/hooks/useMatches";
import { useLocalStore } from "@/hooks/useLocalStore";
import { useRoomStore } from "@/hooks/useRoomStore";
import { useToasts } from "@/hooks/useToasts";
import Toasts from "./Toasts";

export default function StreamScreen() {
  const { toasts, pushToast } = useToasts();

  // Load configs or default to demo mode so OBS works instantly out-of-the-box
  const hasServerToken = process.env.NEXT_PUBLIC_HAS_SERVER_TOKEN === "true";
  const [apiToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_TOKEN) || "";
    }
    return "";
  });
  const [demoMode] = useState(() => {
    if (typeof window !== "undefined") {
      // Mặc định demo nếu chưa có token nào (để OBS chạy ngay); nếu server có token thì chạy thật.
      const stored = localStorage.getItem(LS_DEMO);
      if (stored === null) return !hasServerToken;
      return stored === "1";
    }
    return true;
  });

  const [mode] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(LS_MODE) || "solo"
      : "solo",
  );
  const [roomCode] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(LS_ROOM_CODE) || null
      : null,
  );
  const [roomPlayerId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(LS_ROOM_PLAYER_ID) || null
      : null,
  );

  const { matches, loading } = useMatches(apiToken, demoMode, hasServerToken);

  const inRoom = mode === "room" && roomCode && roomPlayerId;
  const session = useMemo(
    () => (inRoom ? { code: roomCode, playerId: roomPlayerId } : null),
    [inRoom, roomCode, roomPlayerId],
  );

  const local = useLocalStore(inRoom ? [] : matches, pushToast);
  const room = useRoomStore(inRoom ? session : null, matches, pushToast);
  const store = inRoom ? room : local;
  const player = store.player;

  // Stream state controls
  const [isTransparent, setIsTransparent] = useState(false);
  const [isAutoCycle, setIsAutoCycle] = useState(true);
  const [standingsTab, setStandingsTab] = useState("A-D"); // "A-D" | "E-H" | "I-L"
  const [language, setLanguage] = useState("vi"); // "vi" | "en"
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  // Webcam states
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamPosition, setWebcamPosition] = useState("bottom-right"); // "bottom-right" | "bottom-left" | "top-right" | "top-left"
  const [webcamShape, setWebcamShape] = useState("circle"); // "circle" | "rect"
  const [webcamSize, setWebcamSize] = useState(180); // width in pixels
  const videoRef = useRef(null);

  // Group letters map for Left Panel Tabs
  const tabGroups = {
    "A-D": ["A", "B", "C", "D"],
    "E-H": ["E", "F", "G", "H"],
    "I-L": ["I", "J", "K", "L"],
  };

  const currentTabGroups = tabGroups[standingsTab];

  // Auto-cycling loop for standings (runs every 12s)
  useEffect(() => {
    if (!isAutoCycle) return;
    const interval = setInterval(() => {
      setStandingsTab((prev) => {
        if (prev === "A-D") return "E-H";
        if (prev === "E-H") return "I-L";
        return "A-D";
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [isAutoCycle]);

  // Loading indicator for standings cycle progress
  const [cycleProgress, setCycleProgress] = useState(0);
  useEffect(() => {
    if (!isAutoCycle) {
      setCycleProgress(0);
      return;
    }
    setCycleProgress(0);
    const step = 100 / (12000 / 100); // steps every 100ms
    const progressInterval = setInterval(() => {
      setCycleProgress((p) => Math.min(p + step, 100));
    }, 100);
    return () => clearInterval(progressInterval);
  }, [standingsTab, isAutoCycle]);

  // Webcam effect
  useEffect(() => {
    if (!webcamEnabled) return;
    let stream = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        pushToast(
          language === "vi"
            ? "❌ Không thể truy cập webcam. Hãy cấp quyền camera."
            : "❌ Camera access denied. Please allow permissions.",
          "lose",
        );
        setWebcamEnabled(false);
      });
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // pushToast là callback ổn định, không cần đưa vào deps để tránh mở lại webcam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamEnabled, language]);

  // Dynamic body background override for transparent OBS overlay mode
  useEffect(() => {
    if (isTransparent) {
      document.body.style.backgroundColor = "transparent";
      document.body.style.backgroundImage = "none";
    } else {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
    }
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
    };
  }, [isTransparent]);

  // Find the next kickoff match
  const nextMatch = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const now = new Date();
    const upcoming = matches.filter((m) => {
      const isScheduled = m.status === "SCHEDULED" || m.status === "TIMED";
      return isScheduled && new Date(m.utcDate) > now;
    });
    if (upcoming.length === 0) {
      const unfinished = matches.filter((m) => m.status !== "FINISHED");
      return unfinished[0] || matches[0];
    }
    return [...upcoming].sort(
      (a, b) => new Date(a.utcDate) - new Date(b.utcDate),
    )[0];
  }, [matches]);

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false,
  });

  useEffect(() => {
    if (!nextMatch) return;
    const targetTime = new Date(nextMatch.utcDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isOver: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const formatNum = (num) => String(num).padStart(2, "0");

  // Get map of predictions for the current user
  const predictionByMatch = useMemo(() => {
    const m = new Map();
    (player?.predictions || []).forEach((p) => m.set(p.matchId, p));
    return m;
  }, [player]);

  // Get next 5 upcoming matches
  const upcomingMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    const now = new Date();
    const upcoming = matches.filter((m) => {
      const isScheduled =
        m.status === "SCHEDULED" ||
        m.status === "TIMED" ||
        m.status === "IN_PLAY";
      return isScheduled && new Date(m.utcDate) > now;
    });
    const sorted = [...upcoming].sort(
      (a, b) => new Date(a.utcDate) - new Date(b.utcDate),
    );
    return sorted.slice(0, 5);
  }, [matches]);

  // Custom text translations
  const t = {
    vi: {
      nextKickoff: "TRẬN ĐẤU TIẾP THEO",
      hours: "GIỜ",
      minutes: "PHÚT",
      seconds: "GIÂY",
      standingsTitle: "BẢNG XẾP HẠNG VÒNG BẢNG",
      upcomingTitle: "5 TRẬN ĐẤU TIẾP THEO",
      team: "ĐỘI TUYỂN",
      group: "BẢNG",
      p: "Trận",
      gd: "HS",
      pts: "Điểm",
      live: "TRỰC TIẾP",
      noUpcoming: "Không có trận đấu sắp tới",
      connecting: "Kết nối...",
      obsMode: "Chế độ OBS (Trong suốt)",
      autoCycle: "Tự động cuộn bảng",
      webcam: "Camera Streamer Overlay",
      cameraSize: "Kích thước Camera",
      cameraPos: "Vị trí",
      cameraShape: "Dạng",
      fullscreen: "Toàn màn hình",
      exitFullscreen: "Thoát toàn màn hình",
      obsInfo: "Bảng điều khiển này có thể ẩn để không bị ghi hình.",
      backHome: "Về Trang Chủ",
    },
    en: {
      nextKickoff: "NEXT KICKOFF",
      hours: "HOURS",
      minutes: "MINS",
      seconds: "SECS",
      standingsTitle: "GROUP STAGE STANDINGS",
      upcomingTitle: "UPCOMING 5 MATCHES",
      team: "TEAM",
      group: "GRP",
      p: "P",
      gd: "GD",
      pts: "PTS",
      live: "LIVE",
      noUpcoming: "No upcoming matches",
      connecting: "Connecting...",
      obsMode: "OBS Mode (Transparent)",
      autoCycle: "Auto Standing Rotation",
      webcam: "Streamer Webcam Overlay",
      cameraSize: "Webcam Size",
      cameraPos: "Position",
      cameraShape: "Shape",
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit Fullscreen",
      obsInfo: "This controller can be collapsed to avoid capture.",
      backHome: "Back to Home",
    },
  }[language];

  // Symmetrical flag render
  const renderFlag = (teamName, sizeClass = "w-6 h-6") => {
    const imgUrl = flagImgOf(teamName);
    if (imgUrl) {
      return (
        <div
          className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50`}
        >
          <img
            src={imgUrl}
            alt={teamName}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[13px] leading-none`}
      >
        {flagOf(teamName)}
      </div>
    );
  };

  // Symmetrical big flag in square card (Figma layout)
  const renderBigFlagCard = (teamName) => {
    const imgUrl = flagImgOf(teamName);
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-24 h-16 rounded-xl overflow-hidden border border-white/10 bg-slate-950/60 shadow-xl flex items-center justify-center p-0.5 relative group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={teamName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-4xl">{flagOf(teamName)}</span>
          )}
        </div>
        <span className="text-xs font-extrabold text-slate-200 tracking-wide truncate max-w-[120px]">
          {teamName || "TBD"}
        </span>
      </div>
    );
  };

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden flex flex-col font-sans transition-all duration-300 ${
        isTransparent
          ? "bg-transparent text-white"
          : "stream-pitch-bg text-white"
      }`}
    >
      <Toasts toasts={toasts} />

      {/* Background spotlights & elements (hidden in transparent OBS mode) */}
      {!isTransparent && (
        <>
          <div className="stream-spotlight" />
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#334BFF]/5 rounded-full filter blur-3xl pointer-events-none transform -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#FFA07A]/3 rounded-full filter blur-3xl pointer-events-none transform -translate-y-1/2" />
        </>
      )}

      {/* Floating Collapsible Control Panel for the Streamer */}
      <div
        className={`fixed left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
          controlsCollapsed ? "top-[-5px]" : "top-4"
        } w-[92%] max-w-4xl`}
      >
        <div className="relative rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-xl shadow-2xl p-3 px-4 flex flex-col gap-3">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#334BFF] via-[#62F2C0] to-[#FFA07A] uppercase tracking-widest flex items-center gap-1.5">
                ⚽ STREAMER OVERLAY SYSTEM
              </span>
              {loading && (
                <span className="text-[10px] text-slate-500 animate-pulse">
                  ({t.connecting})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 font-bold px-2.5 py-1 rounded-md transition-colors"
              >
                ← {t.backHome}
              </a>
              <button
                onClick={() => setControlsCollapsed(!controlsCollapsed)}
                className="text-[11px] text-[#62F2C0] hover:bg-white/5 border border-white/10 px-2 py-0.5 rounded font-bold transition-all"
              >
                {controlsCollapsed ? "▼ Mở Rộng" : "▲ Ẩn"}
              </button>
            </div>
          </div>

          {/* Control items - Hidden when collapsed */}
          {!controlsCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-400">
              {/* Toggles col 1 */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={isTransparent}
                    onChange={(e) => setIsTransparent(e.target.checked)}
                    className="w-4 h-4 accent-[#334BFF] rounded"
                  />
                  <span>{t.obsMode}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={isAutoCycle}
                    onChange={(e) => setIsAutoCycle(e.target.checked)}
                    className="w-4 h-4 accent-[#334BFF] rounded"
                  />
                  <span>{t.autoCycle}</span>
                </label>
              </div>

              {/* Toggles col 2 */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={webcamEnabled}
                    onChange={(e) => setWebcamEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#334BFF] rounded"
                  />
                  <span>{t.webcam}</span>
                </label>

                <button
                  onClick={toggleFullscreen}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 py-1 px-3 rounded font-bold transition-colors w-fit text-[11px]"
                >
                  📺 {t.fullscreen}
                </button>
              </div>

              {/* Webcam Layout Configs */}
              {webcamEnabled && (
                <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/5 md:col-span-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">
                      {t.cameraPos}:
                    </span>
                    <select
                      value={webcamPosition}
                      onChange={(e) => setWebcamPosition(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none text-[11px]"
                    >
                      <option value="bottom-right">Bottom-Right</option>
                      <option value="bottom-left">Bottom-Left</option>
                      <option value="top-right">Top-Right</option>
                      <option value="top-left">Top-Left</option>
                    </select>

                    <span className="text-[10px] uppercase text-slate-500 font-bold">
                      {t.cameraShape}:
                    </span>
                    <select
                      value={webcamShape}
                      onChange={(e) => setWebcamShape(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 outline-none text-[11px]"
                    >
                      <option value="circle">Tròn</option>
                      <option value="rect">Chữ nhật</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-bold shrink-0">
                      {t.cameraSize}:
                    </span>
                    <input
                      type="range"
                      min="120"
                      max="320"
                      value={webcamSize}
                      onChange={(e) => setWebcamSize(Number(e.target.value))}
                      className="flex-1 accent-[#334BFF] h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-300 font-mono shrink-0">
                      {webcamSize}px
                    </span>
                  </div>
                </div>
              )}

              {/* Language Selection if webcam is off */}
              {!webcamEnabled && (
                <div className="flex flex-col gap-1.5 md:col-span-2 justify-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage("vi")}
                      className={`flex-1 py-1 rounded text-center border font-bold text-[11px] transition-colors ${
                        language === "vi"
                          ? "bg-[#334BFF] border-[#334BFF] text-white"
                          : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`flex-1 py-1 rounded text-center border font-bold text-[11px] transition-colors ${
                        language === "en"
                          ? "bg-[#334BFF] border-[#334BFF] text-white"
                          : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      English
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 italic text-center">
                    💡 {t.obsInfo}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Stream Screen Layout */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-6 pt-28 pb-10 flex flex-col justify-center gap-6">
        {/* Three Column Symmetrical Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full">
          {/* LEFT PANEL: Group Standings (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="stream-glass-panel rounded-2xl p-4 flex-1 flex flex-col border border-white/5 relative overflow-hidden shadow-xl">
              {/* Auto Cycle loading progress bar */}
              {isAutoCycle && (
                <div
                  className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-[#334BFF] to-[#62F2C0] transition-all duration-100 ease-linear"
                  style={{ width: `${cycleProgress}%` }}
                />
              )}

              {/* Left Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-extrabold text-[#62F2C0] tracking-wider uppercase">
                  {t.standingsTitle}
                </h2>

                {/* Autoplay status label */}
                {isAutoCycle && (
                  <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#62F2C0] animate-ping" />
                    AUTO {standingsTab}
                  </span>
                )}
              </div>

              {/* Group Standings Sub-Tabs */}
              <div className="grid grid-cols-3 gap-1.5 mb-4 border-b border-white/5 pb-3">
                {Object.keys(tabGroups).map((tb) => {
                  const active = standingsTab === tb;
                  return (
                    <button
                      key={tb}
                      onClick={() => {
                        setStandingsTab(tb);
                        setIsAutoCycle(false); // pause autoplay when user clicks
                      }}
                      className={`py-1 text-[10px] font-black rounded transition-all ${
                        active
                          ? "bg-[#334BFF] text-white border border-[#334BFF]"
                          : "bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-white/5"
                      }`}
                    >
                      {tb}
                    </button>
                  );
                })}
              </div>

              {/* Standings Blocks Container */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                {currentTabGroups.map((groupLetter) => {
                  // Chỉ tính kết quả thật (đã đá + đang đá realtime), không cộng dự đoán.
                  const standings = calculateGroupStandings(
                    matches,
                    groupLetter,
                    predictionByMatch,
                    false,
                  );

                  return (
                    <div
                      key={groupLetter}
                      className="border border-white/5 bg-slate-950/20 rounded-xl p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 border-b border-white/5 pb-1">
                        <span className="text-[#334BFF]">
                          GROUP {groupLetter}
                        </span>
                        <div className="flex gap-4">
                          <span className="w-4 text-center">P</span>
                          <span className="w-6 text-center">GD</span>
                          <span className="w-6 text-center text-white">
                            PTS
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {standings.slice(0, 4).map((team, idx) => {
                          const isQualified = idx < 2;
                          return (
                            <div
                              key={team.name}
                              className={`flex items-center justify-between text-[10px] py-1 px-1.5 rounded ${
                                isQualified
                                  ? "bg-[#62F2C0]/5 border-l-2 border-[#62F2C0]"
                                  : "border-l-2 border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 text-center font-bold text-slate-500">
                                  {idx + 1}
                                </span>
                                {renderFlag(team.name, "w-4 h-4")}
                                <span className="font-bold text-slate-200 truncate max-w-[90px]">
                                  {team.name}
                                </span>
                                {team.live && (
                                  <span
                                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff5a5a] animate-pulse"
                                    title="Trận đang diễn ra — tỉ số cập nhật trực tiếp"
                                  />
                                )}
                              </div>

                              <div className="flex gap-4 font-mono font-bold">
                                <span className="w-4 text-center text-slate-400">
                                  {team.pj}
                                </span>
                                <span
                                  className={`w-6 text-center ${team.dg > 0 ? "text-[#62F2C0]" : team.dg < 0 ? "text-[#FFA07A]" : "text-slate-400"}`}
                                >
                                  {team.dg > 0 ? `+${team.dg}` : team.dg}
                                </span>
                                <span className="w-6 text-center text-white">
                                  {team.pts}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CENTER PANEL: Large Kickoff Banner & Trophy (col-span-6) */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {nextMatch ? (
              <div className="relative flex flex-col items-center justify-center text-center p-6 min-h-[420px] rounded-3xl border border-white/5 bg-gradient-to-b from-[#08142D] via-[#0B1735]/40 to-[#10204A]/60 shadow-2xl overflow-hidden">
                {/* Glowing Rings under the Trophy */}
                <div className="absolute top-[28%] left-50% pointer-events-none z-0 transform -translate-x-1/2">
                  <div className="trophy-orbit orbit-1" />
                  <div className="trophy-orbit orbit-2" />
                </div>

                {/* Symmetrical contents */}
                <div className="relative z-10 w-full flex flex-col items-center space-y-6">
                  {/* Title & Stage */}
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-[9px] font-extrabold text-[#7b8fff] uppercase tracking-[0.25em] animate-pulse">
                      {t.nextKickoff}
                    </span>
                    <span className="text-3xl font-black text-white uppercase tracking-tighter">
                      NEXT KICKOFF
                    </span>
                  </div>

                  {/* Golden Trophy rendering */}
                  <div className="w-20 h-28 relative flex items-center justify-center my-2 select-none">
                    <img
                      src="/wc2026-emblem.png"
                      alt="World Cup Trophy"
                      className="h-full object-contain filter drop-shadow-[0_0_24px_rgba(245,197,24,0.4)] hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Teams and Big Flags */}
                  <div className="flex items-center justify-center gap-8 w-full max-w-md py-2 px-4 bg-slate-950/20 rounded-2xl border border-white/5 backdrop-blur-md">
                    {/* Home Team */}
                    {renderBigFlagCard(nextMatch.homeTeam?.name)}

                    {/* VS divider */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#62F2C0] uppercase tracking-widest bg-[#62F2C0]/10 border border-[#62F2C0]/20 px-2 py-0.5 rounded-full">
                        {nextMatch.stage === "GROUP_STAGE"
                          ? `${t.group} ${getTeamGroup(nextMatch.homeTeam?.name) || ""}`
                          : nextMatch.stage}
                      </span>
                      <span className="text-lg font-black text-slate-500 italic my-2">
                        VS
                      </span>
                    </div>

                    {/* Away Team */}
                    {renderBigFlagCard(nextMatch.awayTeam?.name)}
                  </div>

                  {/* Symmetrical countdown boxes */}
                  <div className="flex items-center gap-3 font-mono">
                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl backdrop-blur-lg">
                        {formatNum(timeLeft.hours)}
                      </div>
                      <span className="text-[8px] font-extrabold text-slate-500 mt-1.5 uppercase tracking-widest">
                        {t.hours}
                      </span>
                    </div>

                    <span className="text-2xl font-bold text-slate-600 self-start mt-4 animate-pulse">
                      :
                    </span>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl backdrop-blur-lg">
                        {formatNum(timeLeft.minutes)}
                      </div>
                      <span className="text-[8px] font-extrabold text-slate-500 mt-1.5 uppercase tracking-widest">
                        {t.minutes}
                      </span>
                    </div>

                    <span className="text-2xl font-bold text-slate-600 self-start mt-4 animate-pulse">
                      :
                    </span>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-[#FFA07A] shadow-2xl backdrop-blur-lg">
                        {formatNum(timeLeft.seconds)}
                      </div>
                      <span className="text-[8px] font-extrabold text-slate-500 mt-1.5 uppercase tracking-widest">
                        {t.seconds}
                      </span>
                    </div>
                  </div>

                  {/* Stadium & Time Details */}
                  <div className="text-[10px] font-semibold text-slate-400">
                    {vnDateHeader(nextMatch.utcDate)} ·{" "}
                    {vnTime(nextMatch.utcDate)} —{" "}
                    {nextMatch.venue || "BMO Field"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="stream-glass-panel rounded-3xl p-8 min-h-[400px] flex flex-col justify-center items-center text-center">
                <span className="text-5xl mb-4">🏆</span>
                <p className="text-sm text-slate-400 font-bold">
                  {t.noUpcoming}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Future Schedule (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="stream-glass-panel rounded-2xl p-4 flex-1 flex flex-col border border-white/5 relative overflow-hidden shadow-xl">
              {/* Right Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <h2 className="text-[11px] font-extrabold text-[#FFA07A] tracking-wider uppercase">
                  {t.upcomingTitle}
                </h2>
                <span className="text-[9px] font-bold text-slate-500">
                  ESPN
                </span>
              </div>

              {/* Schedule list */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                {upcomingMatches.length > 0 ? (
                  upcomingMatches.map((m) => {
                    const matchGroup = getTeamGroup(m.homeTeam?.name);
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 rounded-xl p-2.5 space-y-1.5 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-wider">
                          <span className="text-slate-400">
                            {m.stage === "GROUP_STAGE"
                              ? `GROUP ${matchGroup || ""}`
                              : m.stage}
                          </span>
                          <span className="text-[#62F2C0]">
                            {vnTime(m.utcDate)} ·{" "}
                            {new Date(m.utcDate).toLocaleDateString("vi-VN", {
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-200">
                          {/* Symmetrical teams view */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            {renderFlag(m.homeTeam?.name, "w-4 h-4")}
                            <span className="truncate max-w-[80px]">
                              {m.homeTeam?.name}
                            </span>
                          </div>

                          <span className="text-[8px] font-bold text-slate-500 px-1 mx-2">
                            vs
                          </span>

                          <div className="flex items-center gap-1.5 min-w-0 justify-end">
                            <span className="truncate max-w-[80px] text-right">
                              {m.awayTeam?.name}
                            </span>
                            {renderFlag(m.awayTeam?.name, "w-4 h-4")}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-[11px] py-12">
                    {t.noUpcoming}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Webcam Overlay Widget */}
      {webcamEnabled && (
        <div
          className={`fixed z-40 overflow-hidden shadow-2xl border-2 border-white/10 group ${
            webcamShape === "circle"
              ? "rounded-full aspect-square"
              : "rounded-2xl"
          } ${
            webcamPosition === "bottom-right"
              ? "bottom-6 right-6"
              : webcamPosition === "bottom-left"
                ? "bottom-6 left-6"
                : webcamPosition === "top-right"
                  ? "top-20 right-6"
                  : "top-20 left-6"
          }`}
          style={{
            width: `${webcamSize}px`,
            height:
              webcamShape === "circle"
                ? `${webcamSize}px`
                : `${Math.round(webcamSize * 0.75)}px`,
            background: "rgba(0,0,0,0.4)",
          }}
        >
          {/* Overlay text / grid overlay inside video for high-end feel */}
          <div className="absolute inset-0 z-10 pointer-events-none border border-[#62F2C0]/20 rounded-inherit" />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-inherit transform scale-x-[-1]"
          />
        </div>
      )}

      {/* Compact footer watermark */}
      <footer className="w-full py-3 text-center text-[8px] font-extrabold tracking-[0.3em] text-slate-600 select-none">
        TINY FOOTBALL Predictor Overlay
      </footer>
    </div>
  );
}
