// NICE Traders Service Worker v1.0
const CACHE_NAME = 'nicetraders-v1';
const STATIC_ASSETS = [
  '/app',
  '/app-manifest.json',
  '/img/NICE-TRADERS-LOGO.png',
  '/img/favicons/apple-touch-icon.png',
  '/img/favicons/favicon-32x32.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname === '/q') {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: { code: 'offline', message: 'You are offline' } }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/app'));
    })
  );
});

// Background sync for offline trade actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Placeholder: in production, read IndexedDB queue and replay
}
