"use client";

import dynamic from "next/dynamic";

const StreamScreen = dynamic(() => import("@/components/StreamScreen"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06101e] text-slate-400 gap-3 font-sans">
      <div className="text-4xl animate-bounce">⚽</div>
      <div className="text-sm font-bold uppercase tracking-widest text-[#334BFF]">
        Đang tải chế độ Stream...
      </div>
    </div>
  ),
});

export default function StreamPage() {
  return <StreamScreen />;
}
