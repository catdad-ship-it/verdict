// Cache-first for the static app shell only — icons/manifest, nothing
// dynamic or per-user. Everything else (pages, API calls) passes straight
// through to the network; this app has no offline-data story, just an
// installable shell per the PWA plan.
const CACHE = 'verdict-shell-v1'
const SHELL = ['/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (!SHELL.includes(url.pathname)) return
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)))
})
