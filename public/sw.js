const CACHE_NAME = 'labdrinks-pwa-v3';
const STATIC_CACHE_NAME = 'labdrinks-static-v3';

// Assets puramente estáticos e imutáveis para pré-cache
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/logo.webp',
  '/favicon.svg',
  '/favicon.ico',
  '/hero.png',
  '/frozen.jpg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Install — Pré-cache de assets visuais estáticos e skipWaiting imediato
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pré-cache parcial:', err);
      });
    })
  );
});

// 2. Activate — Limpeza agressiva de todos os caches antigos (v1, v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
          .map((key) => {
            console.log('Limpando cache legado:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Fetch — Estratégia Inteligente: Network-First para páginas e Network-Only para Admin
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // A. BYPASS COMPLETO: Rotas dinâmicas, Admin, APIs, Firebase e Auth
  // NUNCA cachear o painel admin ou chamadas de banco de dados
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/escala') ||
    url.pathname.startsWith('/lista-compras') ||
    url.pathname.startsWith('/contrato') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('evolution') ||
    url.hostname.includes('gotenberg') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // B. CACHE-FIRST com Network Fallback: Assets estáticos com hash do Next.js e mídias
  if (
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'font' ||
    url.pathname.startsWith('/icons/')
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
        });
      })
    );
    return;
  }

  // C. NETWORK-FIRST para Páginas HTML e Navegações
  // Busca SEMPRE a versão mais recente na rede. Se estiver offline, entrega o cache.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: entrega a página salva em cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // D. STALE-WHILE-REVALIDATE para outras requisições (imagens soltas, etc.)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

