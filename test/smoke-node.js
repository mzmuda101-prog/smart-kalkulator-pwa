// ============================================================
//  Smoke-testy w Node (bez przeglądarki).
//  Ładuje PRAWDZIWE js/data-tables.js + command-definitions.js + app.js
//  pod lekką atrapą DOM i odpala in-app runnery z window.__matm0:
//    runCalcSmokeTests, runParserSmokeTests, runProjectionSmokeTests.
//  Ten sam pipeline co w aplikacji (evalCalcExpression, compileGraphExpression…).
//
//  Uruchom:   node test/smoke-node.js
//  Wyjście:   kod 0 = wszystko PASS, 1 = są niepowodzenia (lista poniżej).
//  Po dodaniu nowej funkcji dorzuć przypadki do runnerów w app.js i odpal to.
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DIR = path.join(__dirname, "..");

// ── Atrapa DOM: rekurencyjny Proxy na funkcji (callable + indeksowalny). ──
function fake() {
  const store = {};
  const t = function () {};
  return new Proxy(t, {
    get(_t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return undefined;
      if (p === 'dataset') return store.__ds || (store.__ds = {});
      if (p === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){return false} };
      if (p === 'style') return store.__st || (store.__st = fake());
      if (p in store) return store[p];
      if (p === 'length') return 0;
      if (['value','textContent','innerHTML','innerText','placeholder','id','className','tagName','type','href','src'].includes(p))
        return store[p] != null ? store[p] : '';
      if (['width','height','offsetWidth','offsetHeight','clientWidth','clientHeight','scrollTop','scrollHeight','top','left','x','y'].includes(p))
        return 0;
      return fake();
    },
    set(_t, p, v) { store[p] = v; return true; },
    apply() { return fake(); },
    has() { return true; },
  });
}

const localStorageStore = {};
const win = fake();
// realne metody tam, gdzie potrzeba sensownego zachowania:
const realWin = {
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
  matchMedia(){ return { matches:false, media:'', addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }; },
  requestAnimationFrame(cb){ return setTimeout(()=>cb(Date.now()),0); },
  cancelAnimationFrame(id){ clearTimeout(id); },
  getComputedStyle(){ return fake(); },
  localStorage: {
    getItem(k){ return k in localStorageStore ? localStorageStore[k] : null; },
    setItem(k,v){ localStorageStore[k] = String(v); },
    removeItem(k){ delete localStorageStore[k]; },
    clear(){ for (const k in localStorageStore) delete localStorageStore[k]; },
  },
  navigator: { vibrate(){}, userAgent:'node', serviceWorker:{ register(){ return Promise.resolve(); }, addEventListener(){} }, onLine:true },
  location: { href:'http://localhost/', protocol:'http:', reload(){} },
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  setTimeout, clearTimeout, setInterval, clearInterval, console,
  fetch(){ return new Promise(()=>{}); }, // nigdy się nie rozwiązuje → kursy „pending"
};
// nałóż realWin na proxy window:
const windowProxy = new Proxy(realWin, {
  get(t,p){ if (p in t) return t[p]; return fake(); },
  set(t,p,v){ t[p]=v; return true; },
  has(){ return true; },
});

const doc = new Proxy({
  getElementById(){ return fake(); },
  querySelector(){ return fake(); },
  querySelectorAll(){ return []; },
  createElement(){ return fake(); },
  createElementNS(){ return fake(); },
  addEventListener(){}, removeEventListener(){},
  documentElement: fake(), body: fake(), head: fake(),
  readyState: 'complete',
}, { get(t,p){ if (p in t) return t[p]; return fake(); }, set(t,p,v){t[p]=v;return true;}, has(){return true;} });

// globalne, z których korzysta app.js (bare references):
global.window = windowProxy;
global.document = doc;
global.localStorage = realWin.localStorage;
global.navigator = realWin.navigator;
global.location = realWin.location;
global.matchMedia = realWin.matchMedia;
global.requestAnimationFrame = realWin.requestAnimationFrame;
global.requestIdleCallback = function(cb){ return setTimeout(()=>cb({ didTimeout:false, timeRemaining(){return 0;} }), 0); };
global.cancelIdleCallback = function(id){ clearTimeout(id); };
global.cancelAnimationFrame = realWin.cancelAnimationFrame;
global.getComputedStyle = realWin.getComputedStyle;
global.fetch = realWin.fetch;
global.HTMLElement = function(){};
global.MediaQueryList = function(){};
global.CanvasRenderingContext2D = function(){}; global.CanvasRenderingContext2D.prototype = {};
global.Path2D = function(){};
global.Image = function(){ return fake(); };
global.ResizeObserver = function(){ return { observe(){}, unobserve(){}, disconnect(){} }; };
global.IntersectionObserver = function(){ return { observe(){}, unobserve(){}, disconnect(){} }; };
global.DOMParser = function(){ return { parseFromString(){ return doc; } }; };

function load(file) {
  const code = fs.readFileSync(path.join(DIR, file), 'utf8');
  vm.runInThisContext(code, { filename: file });
}

try {
  load('js/data-tables.js');
  load('command-definitions.js');
  load('app.js');
} catch (e) {
  console.error('❌ Błąd ładowania:', e && e.stack || e);
  process.exit(2);
}

const api = global.window.__matm0;
if (!api || typeof api.runCalcSmokeTests !== 'function') {
  console.error('❌ window.__matm0.runCalcSmokeTests niedostępne (api:', api && Object.keys(api), ')');
  process.exit(3);
}

const runners = ['runCalcSmokeTests', 'runParserSmokeTests', 'runProjectionSmokeTests'];
let totalPass = 0, totalFail = 0;
const allFails = [];
runners.forEach(name => {
  if (typeof api[name] !== 'function') { console.log(`(pominięto ${name} — brak)`); return; }
  const res = api[name]() || [];
  let p = 0, f = 0;
  res.forEach(r => { if (r.pass) { p++; totalPass++; } else { f++; totalFail++; allFails.push(Object.assign({ runner: name }, r)); } });
  console.log(`  ${f ? '✗' : '✓'} ${name}: ${p}/${p + f} PASS`);
});
console.log(`\n=== RAZEM: ${totalPass}/${totalPass + totalFail} PASS ===`);
if (allFails.length) {
  console.log('\nNIEPRZESZŁE:');
  allFails.forEach(r => console.log('  ✗', '['+r.runner+']', r.expr, '| got:', r.got, r.error ? '| err: ' + r.error : '', r.unit !== undefined ? '| unit: ' + r.unit : ''));
}
process.exit(totalFail ? 1 : 0);
