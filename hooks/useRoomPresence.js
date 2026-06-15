"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Đếm người đang online trong phòng qua Supabase Realtime Presence.
 * Không cần bảng/migration. Dedupe theo userId (nhiều tab = 1 người).
 * Trả về mảng [{ userId, name }].
 */
export function useRoomPresence(session, userId, displayName) {
  const code = session?.code || null;
  const [online, setOnline] = useState([]);

  useEffect(() => {
    if (!code || !userId || !supabase) {
      setOnline([]);
      return;
    }

    const channel = supabase.channel(`presence-${code}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.entries(state).map(([key, metas]) => ({
          userId: key,
          name: metas?.[0]?.name || "Người chơi",
        }));
        setOnline(users);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ name: displayName || "Người chơi" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, userId, displayName]);

  return online;
}
