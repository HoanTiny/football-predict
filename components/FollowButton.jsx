"use client";

import { useFollows } from "@/lib/follows";

/**
 * Nút ★ Theo dõi cho giải đấu hoặc đội. Lưu cục bộ (lib/follows).
 * props: kind "league"|"team", id, name?, size "sm"|"md", showLabel?
 */
export default function FollowButton({ kind, id, name, size = "md", showLabel = false, className = "" }) {
  const f = useFollows();
  const followed = kind === "league" ? f.isLeague(id) : f.isTeam(id);

  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (kind === "league") f.toggleLeague(id);
    else f.toggleTeam({ id, name });
  };

  const pad = size === "sm" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]";

  return (
    <button
      onClick={onClick}
      aria-pressed={followed}
      title={followed ? "Bỏ theo dõi" : "Theo dõi"}
      className={`shrink-0 inline-flex items-center gap-1 rounded-lg font-bold transition-all border ${pad} ${
        followed
          ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
          : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white hover:border-white/20"
      } ${className}`}
    >
      <span className={followed ? "" : "opacity-80"}>{followed ? "★" : "☆"}</span>
      {showLabel && <span>{followed ? "Đang theo dõi" : "Theo dõi"}</span>}
    </button>
  );
}
