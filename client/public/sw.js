// Cache version — bump this string on each deploy to bust all old caches.
// Using a timestamp injected at build time; falls back to a date string.
const CACHE_VERSION = self.__CACHE_VERSION__ || 'sahakargig-' + new Date().toISOString().slice(0, 10);
const STATIC_CACHE  = CACHE_VERSION + '-static';
const API_CACHE     = CACHE_VERSION + '-api';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install: precache shell assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching', PRECACHE_ASSETS.length, 'shell assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: remove every cache from previous versions ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => {
            console.log('[SW] Deleting stale cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: smart routing strategy ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Bypass any Vite dev server / HMR / node_modules chunk requests
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@fs') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('src/') ||
    url.search.includes('?v=')
  ) {
    return;
  }

  // ① API calls — Network-first, fall back to cached response
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ② Navigation requests (HTML pages) — Network-first, offline fallback to shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // ③ Static assets — Cache-first, update cache in background (stale-while-revalidate)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      });
      return cached || networkFetch;
    })
  );
});

// ── Background Web Push & Notification Handlers ──────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '🚨 Emergency Job Alert!', body: 'New gig request nearby! Tap to accept.', url: '/provider/dispatch' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {}

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [500, 200, 500, 200, 800, 200, 800],
    tag: 'emergency-dispatch-alert',
    requireInteraction: true,
    data: { url: data.url || '/provider/dispatch' },
    actions: [
      { action: 'accept', title: '⚡ Accept Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/provider/dispatch';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
