/* ============================================================
   [EN] Service Worker — offline cache for Smart Kalkulator
   Caching strategy: Stale-While-Revalidate (instant z cache + odświeżenie w tle)
   Wersja: JEDNO źródło prawdy w version.js (APP_VERSION).
   ============================================================ */
importScripts('version.js'); // ustawia self.APP_VERSION (np. 'v36')
const CACHE_NAME = 'matm0-calc-' + (self.APP_VERSION || 'v0');
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './version.js',
    './assets/img/icon-pwa-192.png',
    './assets/img/icon-pwa-512.png',
    './assets/img/logo-mateusz-transparent.png',
    './assets/img/logo-mateusz-transparent-pod-loading.png',
    './assets/img/logo-refresh.png',
    './sw.js',
    './js/theme-init.js',
    './js/vendor/decimal.js',
    './js/money-decimal.js',
    './js/calc-layout-tune.js',
    './js/cursor-hint.js',
    './js/data-tables.js',
    './js/smart-parser.js',
    './js/smart-quantity.js',
    './command-definitions.js',
    './app.js',
    './styles.css'
];

/* [EN] Install — pre-cache assetów. NIE robimy skipWaiting() automatycznie:
   nowa wersja czeka (stan „waiting"), a strona pyta usera banerem „Odśwież".
   Pierwsza instalacja (brak aktywnego SW) aktywuje się sama. */
self.addEventListener('install', function(event) {
    console.log('[SW] Install', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS_TO_CACHE);
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

/* [EN] Stale-While-Revalidate: oddaj z cache OD RAZU (jeśli jest), a w tle
   dociągnij świeżą wersję do cache na następne wejście. Offline → cache. */
function staleWhileRevalidate(request, navigateFallback) {
    return caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(request).then(function(cached) {
            var network = fetch(request).then(function(response) {
                if (response && response.status === 200 &&
                    (response.type === 'basic' || response.type === 'cors')) {
                    cache.put(request, response.clone());
                }
                return response;
            }).catch(function() {
                // Offline: użyj cache; dla nawigacji spróbuj powłoki index.html.
                return cached || (navigateFallback ? cache.match('./index.html') : undefined);
            });
            return cached || network;
        });
    });
}

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    /* [EN] Cross-origin (np. kursy NBP/Frankfurter) — czysta sieć, bez cache.
       Offline odrzuci, a strona obsłuży to sama (fallback kursów w localStorage). */
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    /* [EN] Nawigacja (powłoka HTML) — SWR z fallbackiem do index.html. */
    if (event.request.mode === 'navigate') {
        event.respondWith(staleWhileRevalidate(event.request, true));
        return;
    }

    /* [EN] Assety same-origin — SWR. */
    event.respondWith(staleWhileRevalidate(event.request, false));
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
