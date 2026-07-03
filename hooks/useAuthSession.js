"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";

/**
 * Trạng thái đăng nhập DÙNG CHUNG toàn app — cùng 1 tài khoản Supabase cho cả game Dự đoán
 * (phòng chơi) lẫn khu duyệt trận (Đội của tôi). Session tự đồng bộ giữa mọi nơi gọi hook này
 * vì cùng dùng 1 Supabase client (lib/supabase.js).
 */
export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseReady);

  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
