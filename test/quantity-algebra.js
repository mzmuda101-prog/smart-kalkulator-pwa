// ============================================================
//  ALGEBRA WYMIAROWA (js/quantity-algebra.js) — testy poprawności.
//
//  Chroni to, czego stringowy pipeline nie umiał: mnożenie i dzielenie
//  wielkości składa WYMIAR, zamiast doklejać pierwszą wpisaną jednostkę.
//  Przed tym modułem „5 km * 5 km" dawało „25 km", a „10 m / 2 s" — nic.
//
//  Równie ważne są tu BAIL-OUTY: przypadki, w których algebra MUSI oddać
//  robotę staremu silnikowi (sąsiedztwo = suma, waluty, procenty, funkcje).
//
//  Uruchom:  node test/quantity-algebra.js   (albo npm run test:qalg)
//  Kod 0 = OK, 1 = niepowodzenia.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

let pass = 0, fail = 0;
const fails = [];

function near(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
}
// oczekuj value (≈) i unit; unit === undefined → nie sprawdzaj, null → ma być bezwymiarowo
function expect(expr, value, unit) {
    const r = api.evalCalcExpression(expr) || {};
    const okV = (value === undefined) || near(r.value, value);
    const okU = (unit === undefined) || (r.unit === unit);
    if (okV && okU) pass++;
    else { fail++; fails.push({ expr, want: value + ' ' + unit, got: r.value + ' ' + r.unit }); }
}
// oczekuj, że silnik NIC nie zwróci (wymiary niezgodne)
function expectEmpty(expr) {
    const r = api.evalCalcExpression(expr) || {};
    if (r.value == null && r.text == null) pass++;
    else { fail++; fails.push({ expr, want: '∅', got: r.value + ' ' + r.unit }); }
}
// oczekuj konkretnego tekstu wyniku (czytelny czas itp.)
function expectText(expr, text) {
    const r = api.evalCalcExpression(expr) || {};
    if (r.text === text) pass++;
    else { fail++; fails.push({ expr, want: text, got: String(r.text) }); }
}

api.state.settings.defaultUnits.length = '';
api.state.settings.defaultUnits.mass = '';

// ── Iloczyn składa wymiar ──
expect('5 km * 5 km', 25, 'km²');
expect('10 m * 10 m', 100, 'm²');
expect('10 m * 10 m * 10 m', 1000, 'm³');
expect('(5 m)^2', 25, 'm²');
expect('2 m^2 * 3', 6, 'm²');

// ── Iloraz składa wymiar ──
expect('10 m / 2 s', 5, 'm/s');
expect('100 km / 2 h', 50, 'km/h');
expect('1 m / 1 s / 1 s', 1, 'm/s²');
expect('6 kg / 2 m^3', 3, 'kg/m³');

// ── Wymiary się skracają → wynik jest LICZBĄ, nie „5 km" ──
expect('10 km / 2 km', 5, null);
expect('10 m / 5 m', 2, null);
expect('1 h / 10 min', 6, null);

// ── Mnożenie/dzielenie mieszane: jednostka wychodzi z wymiaru ──
expect('60 km/h * 2 h', 120, 'km');
expect('120 km / 60 km/h', 2, 'h');

// ── Jawna konwersja wyniku złożonego ──
expect('10 m / 2 s na km/h', 18, 'km/h');
expect('5 km * 5 km na ha', 2500, 'ha');

// ── Niezgodne wymiary nie dają wyniku (zamiast cichej bzdury) ──
expectEmpty('10 m + 5 s');
expectEmpty('3 kg - 2 m');

// ── BAIL-OUT: sąsiedztwo bez operatora to SUMA, nie iloczyn ──
expectText('3 h 20 min + 45 min', '4 h 5 min');
expect('1 dzień 3 h w min', 1620, 'min');

// ── BAIL-OUT: wymiar odwrotny — „100 / 4 km" to (100/4) km, nie 25 m⁻¹ ──
expect('100 / 4 km', 25, 'km');

// ── BAIL-OUT: stara ścieżka zostaje tam, gdzie była poprawna ──
expect('5 km * 2', 10, 'km');
expect('6 km / 2', 3, 'km');
expect('5 km + 300 m', 5.3, 'km');
expect('2 cm + 5 mm', 2.5, 'cm');
expect('19m + 47%', 27.93, 'm');
expect('100 km/h na m/s', 27.7777777777778, 'm/s');
expect('120 km/h', 120, 'km/h');
expect('2+2', 4, null);

// ── Czytelny czas liczy się z WYNIKU, nie z sumy literałów wejścia ──
expectText('2 h * 3', '6 h');

console.log('');
if (fail) {
    console.error('=== QUANTITY-ALGEBRA: ' + pass + '/' + (pass + fail) + ' PASS ===');
    for (const f of fails) console.error('  ✗ ' + f.expr + ' | chcę: ' + f.want + ' | mam: ' + f.got);
    process.exit(1);
}
console.log('  ✓ quantity-algebra: ' + pass + '/' + pass + ' PASS');
process.exit(0);
