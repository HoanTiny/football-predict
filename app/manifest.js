// Web App Manifest — Next.js App Router convention (app/manifest.js).
// Cho phép cài "Thêm vào màn hình chính" và chạy full-screen như app native.
export default function manifest() {
  return {
    name: "Tiny Sports — Predict & Win",
    short_name: "Tiny Sports",
    description:
      "Dự đoán tỉ số bóng đá, tích điểm, leo BXH toàn cầu cùng bạn bè.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1735",
    theme_color: "#0B1735",
    lang: "vi",
    categories: ["sports", "games", "entertainment"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
