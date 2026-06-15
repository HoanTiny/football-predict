"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchMessages, sendMessage, subscribeMessages } from "@/lib/roomApi";

/**
 * Chat realtime theo phòng. session = { code, ... } | null.
 * userId + displayName dùng để gửi (RLS yêu cầu user_id = auth.uid()).
 */
export function useRoomChat(session, userId, displayName, pushToast) {
  const code = session?.code || null;
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true); // false nếu bảng messages chưa được tạo
  const seen = useRef(new Set());

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

  return { messages, loaded, ready, send };
}
