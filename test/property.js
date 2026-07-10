// ============================================================
//  Property-based testy (fast-check) na PRAWDZIWYM evalCalcExpression.
//  Odpowiednik pythonowego `hypothesis`, tylko w JS i bez przepisywania
//  silnika: ładuje app.js przez test/_bootstrap.js i woła tę samą funkcję,
//  której używa aplikacja.
//
//  Pomysł: zamiast pojedynczych przypadków (to robi smoke-node.js) opisujemy
//  WŁASNOŚCI, które muszą zachodzić dla DOWOLNych danych. fast-check generuje
//  setki losowych wejść i przy awarii sam minimalizuje kontrprzykład.
//
//  Uruchom:   node test/property.js     (albo: npm run test:prop)
//  Wyjście:   kod 0 = wszystkie własności trzymają, 1 = znaleziono kontrprzykład.
//  Uwaga: waluty (zł, $) pomijamy — pod atrapą DOM kursy są „pending" (brak sieci).
// ============================================================
const fc = require('fast-check');
const { api } = require('./_bootstrap');

const NUM_RUNS = Number(process.env.PROP_RUNS) || 300;

// ── Mock kursów walut ───────────────────────────────────────────────────────
// Pod atrapą DOM `fetch` nie rozwiązuje się, więc kursy normalnie zostają „pending".
// Tu wstrzykujemy STAŁĄ tablicę (oś PLN: ile PLN za 1 jednostkę) wprost do STATE.fx,
// tą samą drogą co _commitFxRates → resolveCalcCurrency liczy deterministycznie.
// Dzięki temu możemy testować niezmienniki walutowe bez sieci i bez losowych kursów.
const FX = { PLN: 1, EUR: 4.30, USD: 4.00, GBP: 5.00, CZK: 0.17 };
function seedFx() {
  api.state.fx.rates = Object.assign({}, FX);
  api.state.fx.ts = Date.now();
  api.state.fx.error = null;
  if (api.state.settings) api.state.settings.defaultCurrency = 'PLN'; // gołe sumy → PLN
}
seedFx();

function round2(x) { // [EN] ten sam kontrakt co silnik (MATM0_MONEY.roundMoney)
  const M = global.window.MATM0_MONEY;
  if (M && typeof M.roundMoney === 'function') return M.roundMoney(x);
  return Math.round(x * 100) / 100;
}

// Liczba zwracana przez silnik (null gdy nie policzono / ścieżka BigInt).
function val(expr) {
  const r = api.evalCalcExpression(expr);
  return r && typeof r.value === 'number' ? r.value : null;
}
// Tolerancja względna — sumy całkowite wychodzą dokładnie, procenty bywają ułamkowe.
function approx(a, b, eps = 1e-9) {
  if (a === null || b === null) return false;
  if (!isFinite(a) || !isFinite(b)) return a === b;
  const d = Math.abs(a - b);
  return d <= eps || d <= eps * Math.max(Math.abs(a), Math.abs(b));
}

// Generatory: trzymamy liczby „małe", żeby zostać na ścieżce float (nie BigInt)
// i nie wpaść w problemy reprezentacji — celem jest logika parsera, nie IEEE 754.
const intA = fc.integer({ min: -100000, max: 100000 });
const posA = fc.integer({ min: 1, max: 100000 });
const pct   = fc.integer({ min: 0, max: 100 });

// ── Definicje własności. Każda: { name, run() } gdzie run() albo nic nie robi
//    (PASS), albo rzuca (fast-check podaje kontrprzykład). ───────────────────
const properties = [
  { name: 'dodawanie jest przemienne: a+b == b+a',
    run: () => fc.assert(fc.property(intA, intA, (a, b) =>
      approx(val(`${a}+${b}`), val(`${b}+${a}`))), { numRuns: NUM_RUNS }) },

  { name: 'mnożenie jest przemienne: a*b == b*a',
    run: () => fc.assert(fc.property(intA, intA, (a, b) =>
      approx(val(`${a}*${b}`), val(`${b}*${a}`))), { numRuns: NUM_RUNS }) },

  { name: 'dodawanie jest łączne: (a+b)+c == a+(b+c)',
    run: () => fc.assert(fc.property(intA, intA, intA, (a, b, c) =>
      approx(val(`(${a}+${b})+${c}`), val(`${a}+(${b}+${c})`))), { numRuns: NUM_RUNS }) },

  { name: 'element neutralny: a+0 == a oraz a*1 == a',
    run: () => fc.assert(fc.property(intA, (a) =>
      approx(val(`${a}+0`), a) && approx(val(`${a}*1`), a)), { numRuns: NUM_RUNS }) },

  { name: 'procent od całej bazy: "b+p%" == b*(1+p/100)',
    run: () => fc.assert(fc.property(posA, pct, (b, p) =>
      approx(val(`${b}+${p}%`), b * (1 + p / 100))), { numRuns: NUM_RUNS }) },

  { name: 'łańcuch procentów: "b+p%+p%" == b*(1+p/100)^2',
    run: () => fc.assert(fc.property(posA, pct, (b, p) =>
      approx(val(`${b}+${p}%+${p}%`), b * (1 + p / 100) * (1 + p / 100))), { numRuns: NUM_RUNS }) },

  { name: 'waluta: suma w zł zwija się do PLN: "a zł + b zł" == a+b',
    run: () => fc.assert(fc.property(posA, posA, (a, b) =>
      approx(val(`${a} zł + ${b} zł`), a + b)), { numRuns: NUM_RUNS }) },

  { name: 'waluta: suma EUR zwija się do PLN: "a EUR + b EUR" == (a+b)*kurs',
    run: () => fc.assert(fc.property(posA, posA, (a, b) =>
      approx(val(`${a} EUR + ${b} EUR`), (a + b) * FX.EUR)), { numRuns: NUM_RUNS }) },

  { name: 'waluta: konwersja "a EUR na PLN" == a*kurs',
    run: () => fc.assert(fc.property(posA, (a) =>
      approx(val(`${a} EUR na PLN`), a * FX.EUR)), { numRuns: NUM_RUNS }) },

  { name: 'waluta: konwersja krzyżowa "a EUR na USD" == round2(a*(EUR/USD))',
    // Wyniki walutowe są zaokrąglane do groszy (2 miejsca) — model oczekiwany też.
    run: () => fc.assert(fc.property(posA, (a) =>
      approx(val(`${a} EUR na USD`), round2(a * (FX.EUR / FX.USD)))), { numRuns: NUM_RUNS }) },

  { name: 'waluta: konwersja na tę samą walutę jest tożsamością: "a EUR na EUR" == a',
    run: () => fc.assert(fc.property(posA, (a) =>
      approx(val(`${a} EUR na EUR`), a)), { numRuns: NUM_RUNS }) },

  { name: 'dryf dziesiętny: suma kwot 2-miejscowych == dokładna suma w groszach',
    // Generujemy kwoty jako CAŁKOWITE grosze (prawda bez błędu reprezentacji),
    // składamy wyrażenie z literałów 2-miejscowych i sprawdzamy, że wynik silnika
    // po zaokrągleniu do groszy zgadza się z dokładną sumą groszy. Łapie dryf
    // float (0.1+0.2…), który przesunąłby zaokrąglenie przez granicę grosza.
    run: () => fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: 1000000 }), { minLength: 2, maxLength: 8 }),
      (grosze) => {
        const expr = grosze.map(g => (g / 100).toFixed(2)).join('+');
        const v = val(expr);
        if (v === null) return false;
        const totalGrosze = grosze.reduce((s, g) => s + g, 0);
        return Math.round(v * 100) === totalGrosze;
      }), { numRuns: NUM_RUNS }) },

  { name: 'odporność: dowolny krótki tekst nie rzuca wyjątkiem',
    run: () => fc.assert(fc.property(fc.string({ maxLength: 24 }), (s) => {
      const r = api.evalCalcExpression(s);            // nie może rzucić
      return r && typeof r === 'object' && ('value' in r) && ('error' in r);
    }), { numRuns: NUM_RUNS * 3 }) },                  // fuzz — więcej przebiegów

  { name: 'odporność: losowe wyrażenia z cyfr i operatorów nie rzucają',
    run: () => fc.assert(fc.property(
      fc.stringMatching(/^[0-9+\-*/().,% ]{1,20}$/),
      (s) => {
        const r = api.evalCalcExpression(s);
        return r && typeof r === 'object';
      }), { numRuns: NUM_RUNS * 3 }) },
];

let pass = 0, fail = 0;
for (const prop of properties) {
  try {
    prop.run();
    pass++;
    console.log('  ✓', prop.name);
  } catch (e) {
    fail++;
    console.log('  ✗', prop.name);
    // fast-check wkleja kontrprzykład i seed do komunikatu — pokaż go w całości.
    console.log('      ' + String(e.message || e).split('\n').join('\n      '));
  }
}
console.log(`\n=== WŁASNOŚCI: ${pass}/${pass + fail} OK (numRuns=${NUM_RUNS}) ===`);
process.exit(fail ? 1 : 0);   // wymuszone: atrapa fetch trzyma event-loop otwarty
