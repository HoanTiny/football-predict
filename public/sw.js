// Service worker tối thiểu cho PWA Tiny Football.
// Mục tiêu: cài được lên màn hình chính + offline cơ bản cho app shell.
// LƯU Ý: KHÔNG cache /api/* để tỉ số trận luôn lấy mới (live/realtime).

const CACHE = "tiny-football-v1";
const APP_SHELL = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
  "/football.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // không chặn cài đặt nếu một asset lỗi
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Chỉ xử lý GET, cùng origin. Bỏ qua API (luôn lấy network để dữ liệu mới).
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Điều hướng trang: network-first, fallback cache "/" khi offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match("/"))
      )
    );
    return;
  }

  // Tài nguyên tĩnh (icon, _next/static, font...): cache-first, rồi cập nhật nền.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
