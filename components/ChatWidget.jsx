"use client";

import { useState, useRef, useEffect } from "react";
import { vnTime } from "@/lib/time";
import Icon from "./Icon";

/** Chat nổi theo phòng — chỉ hiển thị khi đang trong phòng. */
export default function ChatWidget({ messages, onSend, myUserId, roomCode, ready }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [seenCount, setSeenCount] = useState(0);
  const listRef = useRef(null);

  const unread = open ? 0 : Math.max(0, messages.length - seenCount);

  // Khi mở (hoặc có tin mới lúc đang mở) → coi như đã đọc + cuộn xuống đáy
  useEffect(() => {
    if (open) setSeenCount(messages.length);
  }, [open, messages.length]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await onSend(t);
  };

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-24 right-4 md:bottom-24 md:right-6 w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[460px] flex flex-col rounded-2xl glass-strong border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="message" className="w-4 h-4 text-[#62F2C0] shrink-0" />
              <div className="leading-tight min-w-0">
                <div className="text-xs font-bold text-white">Chat phòng</div>
                <div className="text-[10px] text-[#F5C518] font-mono tracking-wider truncate">
                  {roomCode}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 -mr-1"
              aria-label="Đóng chat"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2.5"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                <Icon name="message" className="w-8 h-8 text-slate-600" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {ready
                    ? "Chưa có tin nhắn nào. Hãy là người mở màn! 👋"
                    : "Chat chưa được bật. Cần chạy migration Supabase (bảng messages)."}
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.user_id && m.user_id === myUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[80%] ${mine ? "ml-auto items-end" : "items-start"}`}
                  >
                    {!mine && (
                      <span className="text-[10px] font-bold text-[#7b8fff] mb-0.5 px-1 truncate max-w-full">
                        {m.name}
                      </span>
                    )}
                    <div
                      className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
                        mine
                          ? "bg-gradient-to-br from-[#4159FF] to-[#2E44E8] text-white rounded-br-sm"
                          : "bg-white/[0.06] text-slate-100 border border-white/5 rounded-bl-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-slate-600 mt-0.5 px-1">
                      {m.created_at ? vnTime(m.created_at) : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-2.5 border-t border-white/10 bg-white/[0.02] shrink-0">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Nhập tin nhắn…"
              maxLength={500}
              className="glass-input flex-1 px-3 py-2 text-xs"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-b from-[#4159FF] to-[#2E44E8] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_12px_rgba(51,75,255,0.45)] transition-all"
              aria-label="Gửi"
            >
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
          open
            ? "bg-slate-700 text-white"
            : "bg-gradient-to-br from-[#4159FF] to-[#2E44E8] text-white hover:scale-105 hover:shadow-[0_4px_20px_rgba(51,75,255,0.5)]"
        }`}
        aria-label="Mở chat phòng"
      >
        <Icon name={open ? "close" : "message"} className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5a5a] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0B1735]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
