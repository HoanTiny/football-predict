/** @type {import('next').NextConfig} */
const nextConfig = {
  // web-push dùng API Node (crypto) — không bundle, require native.
  serverExternalPackages: ["web-push"],
  async headers() {
    return [
      {
        // Service worker: đúng MIME, không cache để người dùng luôn nhận bản SW mới.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
