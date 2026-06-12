"use client";

import dynamic from "next/dynamic";

// App đọc localStorage ngay khi khởi tạo state → chỉ render phía client
const WC2026App = dynamic(() => import("@/components/WC2026App"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)",
        color: "rgba(200,210,255,0.5)",
        fontFamily: "system-ui, sans-serif",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: 48 }}>⚽</div>
      <div style={{ fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Tiny Football 2026™
      </div>
    </div>
  ),
});

export default function Page() {
  return <WC2026App />;
}
