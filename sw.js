const CACHE = "retoarena-v33";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=30",
  "./app.js?v=31",
  "./supabase-config.js",
  "./auth.js?v=28",
  "./perfil.js?v=27",
  "./retos-supabase.js?v=27",
  "./community.js?v=31",
  "./direct-challenges.js?v=30",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("retoarena-") && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache third-party requests, Supabase/Auth/Storage traffic, or user data.
  if (url.origin !== self.location.origin) return;

  // Navigation: prefer fresh HTML; fall back to the cached app shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("./index.html")) || Response.error())
    );
    return;
  }

  // Cache only known static app assets; don't cache arbitrary same-origin GETs.
  const isStaticAsset = /\.(?:css|js|svg|webmanifest|png|jpe?g|webp|woff2?)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
