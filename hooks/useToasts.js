"use client";

import { useState, useCallback } from "react";

/** Quản lý toast notification: tự huỷ sau 4 giây. */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return { toasts, pushToast };
}
