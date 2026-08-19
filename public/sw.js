const CACHE_NAME = 'labdrinks-pwa-v2';
const STATIC_CACHE_NAME = 'labdrinks-static-v2';

const PRECACHE_ASSETS = [
  '/',
  '/admin',
  '/admin/login',
  '/orcamento',
  '/galeria',
  '/avaliacoes',
  '/manifest.json',
  '/logo.webp',
  '/favicon.svg',
  '/hero.png',
  '/frozen.jpg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Install — Pre-cache critical routes and core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Algum asset estático falhou ao pré-cachear:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate — Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch — Intelligent Multi-Tier Caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Firebase realtime DB, Google Auth, external analytics, and APIs
  if (
    request.method !== 'GET' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('evolution') ||
    url.hostname.includes('gotenberg') ||
    url.pathname.startsWith('/api/') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // A. CACHE-FIRST: Static assets (_next/static, fonts, icons, images, local media)
  // Assets with hashes or immutable nature load instantly from cache (0ms)
  if (
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback for images
          return cached;
        });
      })
    );
    return;
  }

  // B. STALE-WHILE-REVALIDATE: HTML navigation & dynamic app pages
  // Serves instant cached page so user sees zero lag, then refreshes cache in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch((err) => {
          // If offline and no network, return cached response if available
          return cachedResponse;
        });

      // If cached response exists, serve it IMMEDIATELY for 0ms load time
      return cachedResponse || fetchPromise;
    })
  );
});
