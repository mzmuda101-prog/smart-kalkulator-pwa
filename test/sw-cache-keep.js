// Aktualizacja apki (activate) nie kasuje cache modelu OCR. Uruchom: node test/sw-cache-keep.js
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const m = src.match(/function isStaleCache\([\s\S]*?\n\}/);
const isStaleCache = new Function(m[0] + '; return isStaleCache;')();
let fail = 0;
const ok = (n, c) => { if (!c) { fail++; console.log('  ✗', n); } };
ok('stara wersja apki jest kasowana', isStaleCache('matm0-calc-v1', 'matm0-calc-v2'));
ok('bieżąca zostaje', !isStaleCache('matm0-calc-v2', 'matm0-calc-v2'));
ok('cache modeli zostaje', !isStaleCache('matm0-models-v1', 'matm0-calc-v2'));
ok('obcy cache jest kasowany', isStaleCache('inne', 'matm0-calc-v2'));
ok('activate używa isStaleCache', /isStaleCache\(name, CACHE_NAME\)/.test(src));
console.log(fail ? '✗ sw-cache-keep: ' + fail : '✓ sw-cache-keep');
process.exit(fail ? 1 : 0);
