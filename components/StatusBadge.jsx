"use client";

import { isLive } from "@/lib/constants";

/** Flat solid status badges — no gradients, no glow */
export default function StatusBadge({ status, minute }) {
  if (isLive(status)) {
    return (
      <span className="status-pill live text-[10px]">
        <span className="w-1 h-1 rounded-full bg-[#E40000] inline-block animate-pulse" />
        {minute ? `TRỰC TIẾP ${minute}'` : "TRỰC TIẾP"}
      </span>
    );
  }
  if (status === "PAUSED") {
    return (
      <span className="status-pill live text-[10px]">
        ⏸ NGHỈ GIỮA HIỆP
      </span>
    );
  }
  if (status === "FINISHED") {
    return (
      <span className="status-pill finished text-[10px]">
        ✓ KẾT THÚC
      </span>
    );
  }
  // SCHEDULED / TIMED
  return (
    <span className="status-pill upcoming text-[10px]">
      SẮP DIỄN RA
    </span>
  );
}
