import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Tiny Football — Predict & Win · FIFA World Cup 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // cwd có thể là thư mục cha (dev) hoặc gốc dự án (prod) → thử vài đường dẫn
  let emblemSrc = null;
  const candidates = [
    join(process.cwd(), "public", "logo.png"),
    join(process.cwd(), "wc2026", "public", "logo.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      emblemSrc = `data:image/png;base64,${buf.toString("base64")}`;
      break;
    } catch {
      /* thử đường dẫn tiếp theo */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          gap: 64,
          background:
            "linear-gradient(135deg, #06101e 0%, #0B1735 55%, #10204A 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glow accents */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(51,75,255,0.25)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -100,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "rgba(98,242,192,0.12)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />

        {/* Emblem */}
        {emblemSrc && (
          <img
            src={emblemSrc}
            width={300}
            height={463}
            style={{ objectFit: "contain", filter: "drop-shadow(0 12px 40px rgba(245,197,24,0.35))" }}
          />
        )}

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#62F2C0",
              marginBottom: 14,
            }}
          >
            FIFA WORLD CUP 2026
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1,
              color: "#ffffff",
              letterSpacing: -2,
            }}
          >
            TINY FOOTBALL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              marginTop: 6,
              color: "#F5C518",
              letterSpacing: 2,
            }}
          >
            PREDICT &amp; WIN
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 34,
            }}
          >
            {["Live Standings", "Knockout Bracket", "Room Chat"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#cbd5e1",
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
