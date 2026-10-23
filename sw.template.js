/* Service worker «Бессмертная память»: офлайн-режим.
   Стратегии:
   - хэшированные ассеты /assets/* — cache-first (неизменяемы);
   - прочая статика и навигация — network-first с офлайн-фолбэком на кэш/index.html;
   - GET /api/catalog|wall|photos — network-first с кэш-фолбэком
     (каталог и стена читаются и офлайн);
   - внешние изображения (Wikimedia) — stale-while-revalidate.
   VERSION подставляется при сборке (плагин в vite.config.js) — новый деплой
   обновляет SW и вычищает кэши прошлых версий. */
const VERSION = 'v1'
const STATIC_CACHE = `static-${VERSION}`
const PAGES_CACHE = `pages-${VERSION}`
const IMG_CACHE = `img-${VERSION}`
const API_CACHE = `api-${VERSION}`

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE, IMG_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      ))
      // картинки Wikimedia копятся неограниченно — подрезаем до 300 записей
      .then(() => trimCache(IMG_CACHE, 300))
      .then(() => self.clients.claim())
  )
})

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)))
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res && res.ok) cache.put(request, res.clone())
  return res
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res && res.ok) cache.put(request, res.clone())
    return res
  } catch (e) {
    const hit = await cache.match(request)
    if (hit) return hit
    if (fallbackUrl) {
      const fb = await cache.match(fallbackUrl)
      if (fb) return fb
    }
    throw e
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const fetching = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return hit || (await fetching) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE))
      return
    }
    if (url.pathname.startsWith('/api/')) {
      // читаемые данные (каталог, стена, фото) — с фолбэком; остальной API — только сеть
      if (url.pathname === '/api/catalog' || url.pathname === '/api/wall' || url.pathname.startsWith('/api/photos')) {
        event.respondWith(
          networkFirst(request, API_CACHE).catch(() =>
            new Response(JSON.stringify({ monuments: [], entries: [], photos: [] }), {
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
      }
      return
    }
    // навигация и прочая статика
    if (request.mode === 'navigate' || url.pathname.startsWith('/icons/')) {
      event.respondWith(
        networkFirst(request, PAGES_CACHE, '/index.html').catch(() => cacheFirst('/index.html', STATIC_CACHE))
      )
      return
    }
    event.respondWith(cacheFirst(request, PAGES_CACHE))
    return
  }

  // внешние картинки — копим для офлайн-просмотра
  if (/\.wikimedia\.org$/.test(url.hostname) || /openstreetmap\.org$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE))
  }
})
