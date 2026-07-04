// ============================================================
//  Żywe testy POPRAWNOŚCI silnika dla jednostek — w szczególności KOMPOZYCJA
//  WYMIARÓW (× ÷), której dawniej brakowało w testach (stąd „10 km / 2 km" = 5 mm
//  przeszło niezauważone). Model „jednostka jako etykieta": liczby liczą się jak
//  wpisane, jednostka jedzie z wynikiem; wyświetlenie wg ustawień (baza/konkretna/auto).
//
//  Uruchom:  node test/engine-units.js   (albo npm run test:units)
//  Kod 0 = OK, 1 = niepowodzenia.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

let pass = 0, fail = 0;
const fails = [];
function near(a, b) { return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9); }
function setLen(mode) { api.state.settings.defaultUnits.length = mode; }
function setMass(mode) { api.state.settings.defaultUnits.mass = mode; }
// oczekuj value (≈) i unit dla wyrażenia
function expect(expr, value, unit) {
    var r = api.evalCalcExpression(expr) || {};
    var okV = (value === undefined) || near(r.value, value);
    var okU = (unit === undefined) || (r.unit === unit);
    if (okV && okU) { pass++; }
    else { fail++; fails.push({ expr: expr, want: value + ' ' + unit, got: r.value + ' ' + r.unit }); }
}

// ── Tryb domyślny (Raycast): wynik w jednostce roboczej (pierwsza wpisana) ──
setLen(''); setMass('');
expect('10 km / 2 km', 5, 'km');
expect('5 km * 2 km', 10, 'km');
expect('10 m / 5 m', 2, 'm');
expect('6 km / 2', 3, 'km');
expect('5 km + 300 m', 5.3, 'km');
expect('12 km - 12 km', 0, 'km');
expect('19m + 47%', 27.93, 'm');
expect('2 cm + 5 mm', 2.5, 'cm');

// ── Tryb KONKRETNEJ jednostki (km) ──
setLen('km');
expect('10 km / 2 km', 5, 'km');         // ← kluczowy: „5 km", nie „5 mm"
expect('5 km * 2 km', 10, 'km');
expect('6 km / 2', 3, 'km');
expect('5 km + 300 m', 5.3, 'km');

// ── Tryb AUTODOBÓR ──
setLen('__auto__');
expect('10 km / 2 km', 5, 'km');         // autodobór wybiera czytelne km
expect('5 km * 2 km', 10, 'km');
expect('10 m / 5 m', 2, 'm');            // 2 m (a nie 2 mm)
expect('6 km / 2', 3, 'km');
expect('5 km + 300 m', 5.3, 'km');
expect('1500 mm', 1.5, 'm');
expect('100 km', 100, 'km');

setMass('__auto__');
expect('2 kg + 300 g', 2.3, 'kg');
expect('2500 g', 2.5, 'kg');

// ── WALUTY: ten sam model „etykieta" (kursy stubowane, domyślna PLN) ──
api.state.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95 };
api.state.fx.ts = Date.now();
api.state.settings.defaultCurrency = 'PLN';
expect('100 zł / 4 zł', 25, 'zł');         // PLN: 25 zł
expect('5 zł * 2 zł', 10, 'zł');           // 10 zł
expect('100 usd * 4 usd', 1580, 'zł');     // ← był nonsens „6241 zł"; 400 usd = 1580 zł
expect('100 usd / 4 usd', 98.75, 'zł');    // 25 usd = 98,75 zł
expect('12 zł + 20 eur', 98, 'zł');        // miks (suma) — bez zmian
expect('20 usd - 5 usd', 59.25, 'zł');     // 15 usd — bez zmian
expect('1000 zł + vat', 1230, 'zł');       // vat nietknięty
expect('brutto 12 zł', 14.76, 'zł');       // vat nietknięty
expect('20 eur na zł', 86, 'zł');          // konwersja nietknięta

// ── Raport ───────────────────────────────────────────────────────────────────
console.log('  ' + (fail ? '✗' : '✓') + ' engine-units: ' + pass + '/' + (pass + fail) + ' PASS');
if (fails.length) {
    console.log('\nNIEPRZESZŁE:');
    fails.forEach(function (f) { console.log('  ✗', f.expr, '| chcę:', f.want, '| mam:', f.got); });
}
process.exit(fail ? 1 : 0); // atrapa fetch trzyma event-loop → kończymy jawnie
