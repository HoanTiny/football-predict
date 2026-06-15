"use client";

import { useState, useRef, useEffect } from "react";
import { vnTime } from "@/lib/time";
import Icon from "./Icon";

/** Consistent avatar color from name string */
function nameToColor(name = "") {
  const palette = [
    ["#6366f1", "#818cf8"], // indigo
    ["#8b5cf6", "#a78bfa"], // violet
    ["#ec4899", "#f472b6"], // pink
    ["#f59e0b", "#fbbf24"], // amber
    ["#10b981", "#34d399"], // emerald
    ["#06b6d4", "#22d3ee"], // cyan
    ["#f43f5e", "#fb7185"], // rose
    ["#3b82f6", "#60a5fa"], // blue
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [from, to] = palette[h % palette.length];
  return { from, to };
}

function Avatar({ name, size = 28 }) {
  const { from, to } = nameToColor(name);
  const letter = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 800,
        color: "#fff",
        boxShadow: `0 2px 8px ${from}55`,
        userSelect: "none",
      }}
    >
      {letter}
    </div>
  );
}

/** Tiếng "ding" 2 nốt qua Web Audio (không cần file). Tái dùng 1 AudioContext. */
function playBeep(ctxRef) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const note = (freq, t0, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + t0);
      g.gain.exponentialRampToValueAtTime(0.13, now + t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
      o.start(now + t0);
      o.stop(now + t0 + dur + 0.02);
    };
    note(660, 0, 0.12);
    note(880, 0.1, 0.16);
  } catch {}
}

/** Chat nổi theo phòng — premium redesign */
export default function ChatWidget({ messages, onSend, myUserId, roomCode, ready, online = [], typing = [], onTyping }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [seenCount, setSeenCount] = useState(0);
  const [keyboardH, setKeyboardH] = useState(0);
  const [muted, setMuted] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const prevLen = useRef(0);
  const audioCtxRef = useRef(null);

  const unread = open ? 0 : Math.max(0, messages.length - seenCount);
  const onlineCount = online.length;

  // Văn bản "đang gõ…"
  const typingText =
    typing.length === 0
      ? null
      : typing.length === 1
        ? `${typing[0].name} đang gõ`
        : typing.length === 2
          ? `${typing[0].name} và ${typing[1].name} đang gõ`
          : "Nhiều người đang gõ";

  // Khôi phục tuỳ chọn tắt tiếng
  useEffect(() => {
    setMuted(localStorage.getItem("wc2026_chat_muted") === "1");
  }, []);
  const toggleMute = () =>
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("wc2026_chat_muted", next ? "1" : "0");
      return next;
    });

  // Âm thanh báo khi có tin nhắn mới từ người khác (bỏ qua lần tải đầu)
  useEffect(() => {
    if (messages.length > prevLen.current) {
      const last = messages[messages.length - 1];
      const incoming =
        prevLen.current > 0 && last && last.user_id && last.user_id !== myUserId;
      if (incoming && !muted) playBeep(audioCtxRef);
    }
    prevLen.current = messages.length;
  }, [messages, myUserId, muted]);

  // Theo dõi bàn phím mobile qua visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardH(kh);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (open) setSeenCount(messages.length);
  }, [open, messages.length]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);


  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await onSend(t);
  };

  // Group consecutive messages from same sender
  const grouped = messages.reduce((acc, m, i) => {
    const prev = messages[i - 1];
    const isContinuation =
      prev &&
      prev.user_id === m.user_id &&
      new Date(m.created_at) - new Date(prev.created_at) < 2 * 60 * 1000;
    acc.push({ ...m, isContinuation });
    return acc;
  }, []);

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div
          className="fixed z-50 right-4 md:right-6"
          style={{
            width: "min(calc(100vw - 2rem), 360px)",
            // Khi bàn phím hiện: nằm sát trên bàn phím; ngược lại nằm trên bottom-nav
            bottom: keyboardH > 0 ? keyboardH + 8 : 88,
            // dvh co lại theo viewport hiển thị khi bàn phím mở
            height: keyboardH > 0
              ? `min(${window.visualViewport?.height ? window.visualViewport.height - 60 : 320}px, 420px)`
              : "min(62dvh, 480px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
            background: "linear-gradient(180deg, rgba(10,18,45,0.97) 0%, rgba(7,13,35,0.99) 100%)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            animation: "chatSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            transition: "bottom 0.18s ease, height 0.18s ease",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px 12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "linear-gradient(90deg, rgba(51,75,255,0.12) 0%, rgba(98,242,192,0.06) 100%)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* Live dot */}
              <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "#62F2C0",
                    animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "#62F2C0",
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "0.01em" }}>
                  Chat phòng
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#F5C518",
                      fontFamily: "monospace",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {roomCode}
                  </span>
                  <span
                    title={online.map((u) => u.name).filter(Boolean).join(", ")}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#62F2C0",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#62F2C0" }} />
                    {onlineCount} online
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={toggleMute}
                title={muted ? "Bật âm báo tin nhắn" : "Tắt âm báo tin nhắn"}
                style={{
                  color: muted ? "rgba(148,163,184,0.6)" : "#62F2C0",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                aria-label={muted ? "Bật âm" : "Tắt âm"}
              >
                <Icon name={muted ? "mute" : "sound"} className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  color: "rgba(148,163,184,0.6)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                aria-label="Đóng chat"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(148,163,184,0.6)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  opacity: 0.5,
                  padding: "0 24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "rgba(51,75,255,0.15)",
                    border: "1px solid rgba(51,75,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                    <Icon name="message" className="w-6 h-6" style={{ color: "#6b7fff" }} />
                </div>
                <p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.6 }}>
                  {ready
                    ? "Chưa có tin nhắn nào.\nHãy là người mở màn! 👋"
                    : "Chat chưa được bật.\nCần chạy migration Supabase."}
                </p>
              </div>
            ) : (
              grouped.map((m, idx) => {
                const mine = m.user_id && m.user_id === myUserId;
                const showMeta = !mine && !m.isContinuation;
                const isLast =
                  idx === grouped.length - 1 || grouped[idx + 1]?.user_id !== m.user_id;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: mine ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: 8,
                      marginTop: m.isContinuation ? 2 : 10,
                    }}
                  >
                    {/* Avatar slot (other users only) */}
                    {!mine && (
                      <div style={{ width: 28, flexShrink: 0, marginBottom: 2 }}>
                        {isLast && <Avatar name={m.name} size={28} />}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: mine ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        gap: 2,
                      }}
                    >
                      {/* Sender name */}
                      {showMeta && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: nameToColor(m.name).from,
                            paddingLeft: 4,
                            marginBottom: 1,
                          }}
                        >
                          {m.name}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: mine
                            ? `14px 14px ${isLast ? "4px" : "14px"} 14px`
                            : `14px 14px 14px ${isLast ? "4px" : "14px"}`,
                          fontSize: 12,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          ...(mine
                            ? {
                                background: "linear-gradient(135deg, #4159FF, #2E44E8)",
                                color: "#fff",
                                boxShadow: "0 2px 12px rgba(51,75,255,0.35)",
                              }
                            : {
                                background: "rgba(255,255,255,0.07)",
                                color: "rgba(226,232,240,0.95)",
                                border: "1px solid rgba(255,255,255,0.07)",
                              }),
                        }}
                      >
                        {m.text}
                      </div>

                      {/* Timestamp — only on last in group */}
                      {isLast && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "rgba(100,116,139,0.7)",
                            paddingLeft: mine ? 0 : 4,
                            paddingRight: mine ? 4 : 0,
                          }}
                        >
                          {m.created_at ? vnTime(m.created_at) : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Typing indicator ── */}
          {typingText && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 14px 0",
                flexShrink: 0,
              }}
            >
              <span style={{ display: "flex", gap: 3 }}>
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="animate-pulse"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#62F2C0",
                      animationDelay: `${d}ms`,
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: 10, fontStyle: "italic", color: "rgba(148,163,184,0.85)" }}>
                {typingText}…
              </span>
            </div>
          )}

          {/* ── Input ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 10px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.trim() && onTyping) onTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Nhập tin nhắn…"
              maxLength={500}
              style={{
                flex: 1,
                padding: "9px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#e2e8f0",
                fontSize: 12,
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(51,75,255,0.5)";
                e.target.style.boxShadow = "0 0 0 3px rgba(51,75,255,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              style={{
                flexShrink: 0,
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: draft.trim()
                  ? "linear-gradient(135deg, #4159FF, #2E44E8)"
                  : "rgba(255,255,255,0.05)",
                color: draft.trim() ? "#fff" : "rgba(148,163,184,0.4)",
                border: "none",
                cursor: draft.trim() ? "pointer" : "not-allowed",
                transition: "all 0.18s",
                boxShadow: draft.trim() ? "0 2px 12px rgba(51,75,255,0.4)" : "none",
              }}
              aria-label="Gửi"
            >
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle FAB — ẩn khi panel đang mở (dùng X trong header để đóng) ── */}
      {!open && <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          zIndex: 50,
          bottom: 76,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          background: open
            ? "rgba(51,65,85,0.9)"
            : "linear-gradient(135deg, #4159FF 0%, #2E44E8 100%)",
          color: "#fff",
          boxShadow: open
            ? "0 4px 16px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(51,75,255,0.55), 0 0 0 1px rgba(51,75,255,0.3)",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        aria-label="Mở chat phòng"
      >
        <Icon name={open ? "close" : "message"} className="w-5 h-5" />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 9,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #07142d",
              animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes badgePop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  );
}
