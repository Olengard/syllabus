// BookShelf Service Worker
const CACHE = 'bookshelf-v3';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first: sempre dati freschi, fallback cache per offline
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
