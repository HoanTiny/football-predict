"use client";

// Bắt lỗi ở cấp root layout (khi chính layout lỗi). Phải tự render <html>/<body>.
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          gap: "16px",
          margin: 0,
          background: "#06101e",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 48 }}>😵</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Ứng dụng gặp sự cố</div>
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
          Tải lại
        </button>
      </body>
    </html>
  );
}
