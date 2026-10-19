// Service Worker: speichert die App auf dem Handy, damit sie auch offline startet.
// Bei jeder neuen Version VERSION hochzählen, dann holen sich die Handys die neue Fassung.
const VERSION = "caltrack-v1";
const APP = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;

  // Open Food Facts: immer live, nie zwischenspeichern
  if (url.hostname.endsWith("openfoodfacts.org")) return;

  // Schriften von Google: einmal laden, danach aus dem Speicher
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
    return;
  }

  // Die App selbst: erst Netz (damit Updates ankommen), ohne Netz aus dem Speicher
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html"))));
  }
});
