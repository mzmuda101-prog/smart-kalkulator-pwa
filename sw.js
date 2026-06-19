/* ============================================================
   [EN] Service Worker — offline cache for Kalkulator by Matm0
   Caching strategy: Network First with cache fallback
   ============================================================ */
const CACHE_NAME = 'matm0-calc-v27';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './logo-mateusz-transparent.png',
    './logo-refresh.png',
    './sw.js',
    './command-definitions.js',
    './app.js',
    './styles.css'
];

/* [EN] Install event — pre-cache essential assets */
self.addEventListener('install', function(event) {
    console.log('[SW] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(function() {
            /* [EN] Activate immediately — skip waiting */
            return self.skipWaiting();
        })
    );
});

/* [EN] Activate event — clean old caches */
self.addEventListener('activate', function(event) {
    console.log('[SW] Activate');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(name) {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(function() {
            /* [EN] Take control of all clients immediately */
            return self.clients.claim();
        }).then(function() {
            /* [EN] Notify all clients that a new SW is active so they can refresh */
            return self.clients.matchAll().then(function(clients) {
                clients.forEach(function(client) {
                    client.postMessage({ action: 'sw-updated' });
                });
            });
        })
    );
});

function cacheResponse(request, response) {
    if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
    }
    const responseClone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
        cache.put(request, responseClone);
    });
    return response;
}

/* [EN] Fetch event — network-first to avoid stale debug builds */
self.addEventListener('fetch', function(event) {
    /* [EN] Only handle GET requests */
    if (event.request.method !== 'GET') return;

    /* [EN] Skip non-http(s) requests (e.g. chrome-extension://) */
    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    /* [EN] For navigation requests (HTML shell), prefer the newest file */
    if (event.request.mode === 'navigate') {
            // Cache the navigation response using the original request to ensure proper caching
            event.respondWith(
                fetch(event.request, { cache: 'no-store' }).then(function(response) {
                    return cacheResponse(event.request, response);
                }).catch(function() {
                    return caches.match(event.request);
                })
            );
        return;
    }

    /* [EN] For same-origin assets, prefer network so temporary servers do not look stale */
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).then(function(response) {
                return cacheResponse(event.request, response);
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || new Response('Offline — resource not cached', { status: 503 });
                });
            })
        );
        return;
    }

    /* [EN] For cross-origin requests (np. kursy NBP) — sieć; offline odrzuci, a strona
       obsłuży błąd sama (loadFxRates → fallback na cache w localStorage). Bez cache'owania. */
    event.respondWith(fetch(event.request));
});

/* [EN] Message listener — allows page to trigger skipWaiting + cache purge */
self.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'skip-waiting') {
        console.log('[SW] Received skip-waiting — activating now');
        self.skipWaiting();
    }
    if (event.data && event.data.action === 'purge-caches') {
        console.log('[SW] Purging all caches');
        event.waitUntil(
            caches.keys().then(function(names) {
                return Promise.all(names.map(function(name) {
                    console.log('[SW] Deleting cache:', name);
                    return caches.delete(name);
                }));
            })
        );
    }
});
