"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchMessages, sendMessage, subscribeMessages } from "@/lib/roomApi";
import { supabase } from "@/lib/supabase";

/**
 * Chat realtime theo phòng. session = { code, ... } | null.
 * userId + displayName dùng để gửi (RLS yêu cầu user_id = auth.uid()).
 */
export function useRoomChat(session, userId, displayName, pushToast) {
  const code = session?.code || null;
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true); // false nếu bảng messages chưa được tạo
  const [typing, setTyping] = useState([]); // [{userId, name}] — người đang gõ (trừ mình)
  const seen = useRef(new Set());
  const typingChannel = useRef(null);
  const typingTimers = useRef({});
  const lastTypingSent = useRef(0);

  const addMsg = useCallback((row) => {
    if (!row || seen.current.has(row.id)) return;
    seen.current.add(row.id);
    setMessages((prev) => [...prev, row]);
  }, []);

  useEffect(() => {
    seen.current = new Set();
    setMessages([]);
    setLoaded(false);
    if (!code) return;

    let active = true;
    fetchMessages(code)
      .then((rows) => {
        if (!active) return;
        rows.forEach((r) => seen.current.add(r.id));
        setMessages(rows);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(false); // bảng chưa tồn tại / lỗi quyền
      })
      .finally(() => active && setLoaded(true));

    const unsub = subscribeMessages(code, (row) => active && addMsg(row));
    return () => {
      active = false;
      unsub();
    };
  }, [code, addMsg]);

  // Kênh broadcast "đang gõ…" (ephemeral, không cần bảng)
  useEffect(() => {
    setTyping([]);
    Object.values(typingTimers.current).forEach(clearTimeout);
    typingTimers.current = {};
    if (!code || !supabase) return;

    const ch = supabase.channel(`typing-${code}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload || !payload.userId || payload.userId === userId) return;
      setTyping((prev) => [
        ...prev.filter((p) => p.userId !== payload.userId),
        { userId: payload.userId, name: payload.name },
      ]);
      clearTimeout(typingTimers.current[payload.userId]);
      typingTimers.current[payload.userId] = setTimeout(() => {
        setTyping((prev) => prev.filter((p) => p.userId !== payload.userId));
      }, 3500);
    });
    ch.subscribe();
    typingChannel.current = ch;

    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
      supabase.removeChannel(ch);
      typingChannel.current = null;
    };
  }, [code, userId]);

  const notifyTyping = useCallback(() => {
    const ch = typingChannel.current;
    if (!ch || !userId) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 1200) return; // throttle ~1.2s
    lastTypingSent.current = now;
    ch.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, name: displayName || "Người chơi" },
    });
  }, [userId, displayName]);

  const send = useCallback(
    async (text) => {
      const t = (text || "").trim().slice(0, 500);
      if (!t || !code || !userId) return false;
      try {
        await sendMessage(code, userId, displayName || "Người chơi", t);
        return true;
      } catch (e) {
        pushToast?.(
          ready
            ? `Không gửi được tin nhắn: ${e.message}`
            : "Chat chưa được bật — cần chạy migration Supabase.",
          "lose"
        );
        return false;
      }
    },
    [code, userId, displayName, ready, pushToast]
  );

  return { messages, loaded, ready, send, typing, notifyTyping };
}
