// Service Worker — Syllabus PWA
// Strategia: network-first per le API, cache-first per le risorse statiche

const CACHE = 'syllabus-v1'
const STATIC = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Le chiamate API (Supabase, Anthropic) vanno sempre in rete
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('anthropic') ||
      e.request.method !== 'GET') {
    return
  }

  // Per tutto il resto: network-first con fallback alla cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
