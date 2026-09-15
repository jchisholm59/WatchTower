// Deliberately does no caching. WatchTower is a live dashboard (camera
// streams, MQTT events, notifications) — caching responses would mean
// serving stale data, and caching the app shell would mean a deployed
// update might not reach a phone that already installed the PWA. This
// service worker exists only to satisfy the installability requirement
// for "Add to Home Screen" / the Android TWA wrapper (Chrome requires a
// registered service worker with a fetch handler), not to work offline.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
