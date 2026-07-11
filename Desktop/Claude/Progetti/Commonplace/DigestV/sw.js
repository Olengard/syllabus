// Digest Service Worker — network-first, cache solo come fallback offline
const CACHE = 'digest-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; // mai cache sulle API
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
