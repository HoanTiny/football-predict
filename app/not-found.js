import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang — Tiny Football" };

export default function NotFound() {
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
        gap: "14px",
        background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: "0.05em",
          background: "linear-gradient(135deg, #4159FF, #62F2C0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Không tìm thấy trang</div>
      <p style={{ fontSize: 13, color: "rgba(200,210,255,0.6)", maxWidth: 360 }}>
        Trang bạn tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link
        href="/"
        style={{
          padding: "10px 22px",
          borderRadius: 10,
          background: "#334BFF",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Về trang chủ
      </Link>
    </div>
  );
}
