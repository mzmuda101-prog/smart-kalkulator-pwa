// Aktualizacja apki (activate), purge-caches w SW i purgeAppCaches w apce nie kasują cache modelu OCR.
// Uruchom: node test/sw-cache-keep.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let fail = 0;
const ok = (n, c) => { if (!c) { fail++; console.log('  ✗', n); } };
const sorted = (a) => JSON.stringify(a.slice().sort());

/** sw.js w piaskownicy: prawdziwe version.js przez importScripts, udawane Cache Storage. */
function loadSw(names) {
  const listeners = {}, deleted = [];
  const ctx = {
    console: { log() {} }, Promise, URL,
    caches: { keys: async () => names.slice(), delete: async (n) => { deleted.push(n); return true; } },
    clients: { claim: async () => {}, matchAll: async () => [] },
    location: { origin: 'https://x' },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: async () => {},
  };
  ctx.self = ctx;
  ctx.importScripts = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const fire = async (type, ev) => { let p; listeners[type]({ ...ev, waitUntil: (x) => { p = x; } }); await p; };
  return { ctx, deleted, fire };
}

(async () => {
  const { ctx, deleted, fire } = loadSw([]);
  const cur = vm.runInContext('CACHE_NAME', ctx);
  const names = [cur, 'matm0-calc-v0', 'matm0-models-v1', 'matm0-models-v0', 'inne'];
  const isStaleCache = vm.runInContext('isStaleCache', ctx);
  ok('MODELS_CACHE z version.js', ctx.MODELS_CACHE === 'matm0-models-v1');
  ok('stara wersja apki jest kasowana', isStaleCache('matm0-calc-v1', 'matm0-calc-v2'));
  ok('bieżąca zostaje', !isStaleCache('matm0-calc-v2', 'matm0-calc-v2'));
  ok('cache modeli zostaje', !isStaleCache('matm0-models-v1', 'matm0-calc-v2'));
  ok('starszy cache modeli (po podbiciu nazwy) jest kasowany', isStaleCache('matm0-models-v0', 'matm0-calc-v2'));
  ok('obcy cache jest kasowany', isStaleCache('inne', 'matm0-calc-v2'));

  const a = loadSw(names);
  await a.fire('activate', {});
  ok('activate: kasuje stare, zostawia bieżący i model', sorted(a.deleted) === sorted(['matm0-calc-v0', 'matm0-models-v0', 'inne']));

  const p = loadSw(names);
  await p.fire('message', { data: { action: 'purge-caches' } });
  ok('purge-caches w SW: zostaje tylko model', sorted(p.deleted) === sorted(names.filter((n) => n !== 'matm0-models-v1')));

  // purgeAppCaches z app.js (aktualizacja i „Wyczyść cache i przeładuj”)
  const m = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/function purgeAppCaches\(\) \{[\s\S]*?\n {8}\}/);
  ok('app.js ma purgeAppCaches', !!m);
  if (m) {
    const del = [];
    const fake = { keys: async () => names.slice(), delete: async (n) => { del.push(n); return true; } };
    const win = { isModelsCache: ctx.isModelsCache, caches: fake };
    await new Function('window', 'caches', m[0] + '; return purgeAppCaches;')(win, fake)();
    ok('purgeAppCaches: zostaje tylko model', sorted(del) === sorted(names.filter((n) => n !== 'matm0-models-v1')));
  }

  console.log(fail ? '✗ sw-cache-keep: ' + fail : '✓ sw-cache-keep');
  process.exit(fail ? 1 : 0);
})();
