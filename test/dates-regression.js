// ============================================================
//  Regresja DAT — deterministyczna siatka na przypiętym „dziś".
//  Łapie błędy, których nie wychwyci baseline (pomija wyrażenia względne)
//  ani luźne smoke („zwraca jakąś datę"). Kotwica: 1.07.2026 (środa).
//
//  Uruchom:  node test/dates-regression.js   (albo: npm run test:dates)
//  Kod 0 = PASS, 1 = są niepowodzenia.
// ============================================================
'use strict';
const fc = require('fast-check');
const { api } = require('./_bootstrap');

const parser = global.window.MATM0_PARSER;
if (!parser || typeof parser.setTodayForTests !== 'function') {
  console.error('❌ MATM0_PARSER.setTodayForTests niedostępne');
  process.exit(2);
}

// Kotwica — środa 1.07.2026, północ lokalna.
const ANCHOR = new Date(2026, 6, 1, 0, 0, 0, 0);
parser.setTodayForTests(ANCHOR);
const NOW_ANCHOR = new Date(2026, 6, 1, 14, 35, 0, 0); // „teraz" — 1.7.26 14:35
parser.setNowForTests(NOW_ANCHOR);

function evalText(expr) {
  try {
    const r = api.evalCalcExpression(expr);
    return r && r.text != null ? r.text : null;
  } catch (e) {
    return 'ERR:' + (e && e.message);
  }
}
function evalKind(expr) {
  try {
    const r = api.evalCalcExpression(expr);
    return r && r.kind || null;
  } catch (e) {
    return 'ERR';
  }
}

// ── 1. Twardy snapshot — konkretne wyrażenia z helpa + warianty bez spacji ──
const CASES = [
  // zgłoszone przez użytkownika
  { expr: 'dziś + 20h', text: '2.7.2026 (czwartek)', kind: 'date' },
  { expr: 'dzis + 20h', text: '2.7.2026 (czwartek)', kind: 'date' },
  { expr: 'dzis+5dni', text: '6.7.2026 (poniedziałek)', kind: 'date' },
  { expr: 'dzis + 5 dni', text: '6.7.2026 (poniedziałek)', kind: 'date' },
  { expr: 'dziś - 2 dni', text: '29.6.2026 (poniedziałek)', kind: 'date' },
  { expr: 'dzis-2dni', text: '29.6.2026 (poniedziałek)', kind: 'date' },
  { expr: 'dziś + 90 dni', text: '29.9.2026 (wtorek)', kind: 'date' },
  { expr: '90 dni + dziś', text: '29.9.2026 (wtorek)', kind: 'date' },
  // kompaktowe warianty
  { expr: 'dziś+90dni', text: '29.9.2026 (wtorek)', kind: 'date' },
  { expr: 'dzis-2 dni', text: '29.6.2026 (poniedziałek)', kind: 'date' },
  { expr: 'dziś+ 5 dni', text: '6.7.2026 (poniedziałek)', kind: 'date' },
  // za / temu — kompakt
  { expr: 'za 3 tygodnie', text: '22.7.2026 (środa)', kind: 'date' },
  { expr: 'za3tygodnie', text: '22.7.2026 (środa)', kind: 'date' },
  { expr: 'za 3 tyg', text: '22.7.2026 (środa)', kind: 'date' },
  { expr: '3 dni temu', text: '28.6.2026 (niedziela)', kind: 'date' },
  { expr: '3dnitemu', text: '28.6.2026 (niedziela)', kind: 'date' },
  // tokeny względne
  { expr: 'dziś', text: '1.7.2026 (środa)', kind: 'date' },
  { expr: 'dzisiaj', text: '1.7.2026 (środa)', kind: 'date' },
  { expr: 'jutro', text: '2.7.2026 (czwartek)', kind: 'date' },
  { expr: 'wczoraj', text: '30.6.2026 (wtorek)', kind: 'date' },
  // data absolutna + offset
  { expr: '1.09.2026 + 7 dni', text: '8.9.2026 (wtorek)', kind: 'date' },
  { expr: '1.09.2026 + 7dni', text: '8.9.2026 (wtorek)', kind: 'date' },
  { expr: '1.01.2026 + 90 dni', text: '1.4.2026 (środa)', kind: 'date' },
  { expr: '1.09.2026 + 2 tyg', text: '15.9.2026 (wtorek)', kind: 'date' },
  // godziny na dacie — zawijanie doby
  { expr: 'dziś + 25h', text: '2.7.2026 (czwartek)', kind: 'date' },
  { expr: 'dziś + 90 min', text: '1.7.2026 (środa)', kind: 'date' },
  // odliczanie / różnica (deterministyczne)
  { expr: 'ile dni od 1.01.2026 do 1.02.2026', text: '31 dni', kind: 'date', value: 31 },
  { expr: 'ile dni do 1.09', text: '62 dni', kind: 'date', value: 62 },
  // „teraz" — pełny moment (kotwica 14:35)
  { expr: 'teraz', text: '1.7.26 14:35 (środa)', kind: 'date' },
  { expr: 'now', text: '1.7.26 14:35 (środa)', kind: 'date' },
  { expr: 'czas', text: '1.7.26 14:35 (środa)', kind: 'date' },
  { expr: 'time', text: '1.7.26 14:35 (środa)', kind: 'date' },
  { expr: 'teraz - 2 dni', text: '29.6.26 14:35 (poniedziałek)', kind: 'date' },
  { expr: 'teraz-2dni', text: '29.6.26 14:35 (poniedziałek)', kind: 'date' },
  { expr: 'teraz - 56h', text: '29.6.26 06:35 (poniedziałek)', kind: 'date' },
  { expr: 'teraz-56godzin', text: '29.6.26 06:35 (poniedziałek)', kind: 'date' },
  { expr: 'teraz + 90 min', text: '1.7.26 16:05 (środa)', kind: 'date' },
  { expr: 'teraz+90min', text: '1.7.26 16:05 (środa)', kind: 'date' },
  // dzień tygodnia + offset (kotwica 1.07.2026 + 3 tyg → 27.07 poniedziałek)
  { expr: 'poniedziałek za 3 tygodnie', text: '27.7.2026 (poniedziałek)', kind: 'date' },
  { expr: 'monday in 3 weeks', text: '27.7.2026 (poniedziałek)', kind: 'date' },
  // ISO 8601 Zulu — wyświetlanie w strefie lokalnej Node (UTC → lokalnie)
  { expr: '2026-03-15T14:30:00Z', textMatch: /15\.3\.(2026|26)/, kind: 'date' },
];

let pass = 0, fail = 0;
const fails = [];

CASES.forEach(function (c) {
  const gotText = evalText(c.expr);
  const gotKind = evalKind(c.expr);
  let ok = gotKind === c.kind;
  if (c.textMatch) ok = ok && c.textMatch.test(gotText || '');
  else ok = ok && gotText === c.text;
  if (ok && c.value != null) {
    const r = api.evalCalcExpression(c.expr);
    ok = r && r.value === c.value;
  }
  if (ok) { pass++; } else {
    fail++;
    fails.push({ expr: c.expr, want: c.text, got: gotText, kind: gotKind });
  }
});

console.log('  ' + (fail ? '✗' : '✓') + ' dates snapshot: ' + pass + '/' + (pass + fail) + ' PASS');
if (fails.length) {
  console.log('\nNIEPRZESZŁE (snapshot):');
  fails.forEach(function (f) {
    console.log('  ✗', f.expr, '| want:', f.want, '| got:', f.got, '| kind:', f.kind);
  });
}

// ── 2. Parytet spacji — kompakt vs czytelny MUSI dać ten sam wynik ──
const SPACING_PAIRS = [
  ['dzis+5dni', 'dzis + 5 dni'],
  ['dzis-2dni', 'dziś - 2 dni'],
  ['dziś+90dni', 'dziś + 90 dni'],
  ['za3tygodnie', 'za 3 tygodnie'],
  ['3dnitemu', '3 dni temu'],
  ['1.09.2026+7dni', '1.09.2026 + 7 dni'],
  ['dzis+20h', 'dzis + 20h'],
  ['teraz-2dni', 'teraz - 2 dni'],
  ['teraz+90min', 'teraz + 90 min'],
];

let spPass = 0, spFail = 0;
SPACING_PAIRS.forEach(function (pair) {
  const a = evalText(pair[0]), b = evalText(pair[1]);
  if (a && a === b) spPass++;
  else {
    spFail++;
    console.log('  ✗ paritet:', pair[0], '≠', pair[1], '|', a, 'vs', b);
  }
});
console.log('  ' + (spFail ? '✗' : '✓') + ' dates paritet spacji: ' + spPass + '/' + (spPass + spFail) + ' PASS');

// ── 3. Property-based — kompakt i czytelny zapis zawsze równy ──
let propFail = false;
try {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 365 }), function (n) {
      const a = evalText('dziś+' + n + 'dni');
      const b = evalText('dziś + ' + n + ' dni');
      return a && a === b;
    }),
    { numRuns: 150 }
  );
  console.log('  ✓ dates property kompakt==czytelny: PASS');
} catch (e) {
  propFail = true;
  console.log('  ✗ dates property kompakt==czytelny:', (e && e.message) || e);
}

// ── 4. Parser NIE łapie czystej matematyki / walut jako daty ──
const MUST_NOT_DATE = ['2+3', '100 zł + 20 eur', '17:00 + 3h', '537 + 12%'];
let guardPass = 0, guardFail = 0;
MUST_NOT_DATE.forEach(function (expr) {
  const k = evalKind(expr);
  if (k === 'date') { guardFail++; console.log('  ✗ fałszywa data:', expr, '→ kind date'); }
  else guardPass++;
});
console.log('  ' + (guardFail ? '✗' : '✓') + ' dates guard (nie-matma): ' + guardPass + '/' + (guardPass + guardFail) + ' PASS');

parser.clearTodayForTests();
parser.clearNowForTests();

const totalFail = fail + spFail + (propFail ? 1 : 0) + guardFail;
console.log('\n=== dates-regression: ' + (totalFail ? 'FAIL' : 'OK') + ' ===');
process.exit(totalFail ? 1 : 0);
