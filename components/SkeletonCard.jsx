"use client";

/** Flat skeleton loading card */
export default function SkeletonCard() {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 76 }}
    >
      {/* Symmetrical match loader */}
      <div className="flex-grow flex flex-col justify-center">
        <div className="flex items-center gap-4">
          {/* Team 1 */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="h-4 w-20 rounded bg-white/5 shimmer" />
            <div className="w-8 h-8 rounded-full bg-white/5 shrink-0 shimmer" />
          </div>

          {/* Score Capsule */}
          <div className="h-8 w-16 rounded bg-white/5 border border-white/5 shrink-0 shimmer" />

          {/* Team 2 */}
          <div className="flex-1 flex items-center justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-white/5 shrink-0 shimmer" />
            <div className="h-4 w-20 rounded bg-white/5 shimmer" />
          </div>
        </div>

        {/* Info sub-row */}
        <div className="flex justify-center items-center gap-2 mt-2">
          <div className="h-3 w-12 rounded bg-white/5 shimmer" />
          <div className="h-3 w-16 rounded bg-white/5 shimmer" />
          <div className="h-3 w-10 rounded bg-white/5 shimmer" />
        </div>
      </div>

      {/* Button loader */}
      <div className="shrink-0 h-8 w-20 rounded bg-[#334BFF]/10 shimmer" />
    </div>
  );
}
