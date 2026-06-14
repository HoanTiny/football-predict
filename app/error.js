"use client";

// Error Boundary cấp route — bắt lỗi runtime để không trắng màn hình.
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Ghi log để theo dõi (Vercel logs)
    console.error("App error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        gap: "16px",
        background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 48 }}>😵</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Đã có lỗi xảy ra</div>
      <p style={{ fontSize: 13, color: "rgba(200,210,255,0.6)", maxWidth: 360 }}>
        Ứng dụng gặp sự cố ngoài ý muốn. Bạn thử lại nhé — dữ liệu cược của bạn vẫn an toàn.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: "#334BFF",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Thử lại
      </button>
    </div>
  );
}
