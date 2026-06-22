/* ============================================================
   [EN] APP VERSION — JEDNO źródło prawdy o wersji aplikacji.
   Bumpuj TYLKO tutaj. Czytają to ZARÓWNO Service Worker (importScripts),
   JAK I strona (index.html). Z tego buduje się nazwa cache i napis w UI.
   Konwencja: 'vN' (np. 'v36'). Bumpnij przy każdym wydaniu zmian w assetach.
   ============================================================ */
var APP_VERSION = 'v48.5';

/* Udostępnij w obu światach: SW (self) i okno przeglądarki (window). */
if (typeof self !== 'undefined') { self.APP_VERSION = APP_VERSION; }
if (typeof window !== 'undefined') { window.APP_VERSION = APP_VERSION; }
