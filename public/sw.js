const CACHE = 'riri-v1';

// Pre-cache the shell so the app loads offline
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Always go network for Supabase (auth/DB/functions) — never cache credentials or live data
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.io')) return;

  // Navigation requests: network-first, fall back to cached index or offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match('/')
            .then((cached) => cached ?? caches.match('/offline.html')),
        ),
    );
    return;
  }

  // Static assets: cache-first, populate cache on miss
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/offline.html'));
    }),
  );
});
