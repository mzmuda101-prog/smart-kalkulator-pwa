// ============================================================
//  SILNIK CZYTA WŁASNY WYNIK — niezmiennik round-tripu.
//
//  Po „=" wynik wraca do pola wyrażenia, a z historii można go kliknąć,
//  żeby liczyć dalej. Jeśli silnik nie umie odczytać tego, co sam wypisał,
//  użytkownik dostaje w polu martwy tekst i wynik „—".
//
//  Realne przypadki, które to łapie (wszystkie były zepsute):
//    „30.1"         → „30.1.2026 (piątek)" → ∅   (opisowy nawias z dniem)
//    „jutro"        → „22.9.2026 (wtorek)"  → ∅
//    „17:00 + 3h"   → „20:00"               → ∅   (gołe HH:MM nie liczyło się)
//    „czas w Tokio" → „07:05 (Tokio)"       → ∅   (opisowy nawias z miastem)
//    „5 km * 5 km"  → „25 km²"              → ∅   (indeks górny ≠ nazwa jednostki)
//
//  Uruchom:  node test/readback.js   (albo npm run test:readback)
//  Kod 0 = OK, 1 = niepowodzenia.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

api.state.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95, GBP: 5.00 };
api.state.fx.ts = Date.now();

let pass = 0, fail = 0;
const fails = [];

// Wyrażenia reprezentujące KAŻDY rodzaj wyniku, jaki apka potrafi wypisać.
const EXPRS = [
    // liczby i jednostki
    '2+2', '1/3', '100/7', '2^64', '99999999999999999+1',
    '5 km + 300 m', '1500 mm', '2 kg + 300 g', '145 min', '1000h',
    // wymiary złożone (algebra)
    '5 km * 5 km', '10 m / 2 s', '60 km/h * 2 h', '6 kg / 2 m^3', '10 m * 10 m * 10 m',
    // pieniądze i procenty
    '100 usd', '12 zł * 3', '20% z 150', '1000 zł + vat', '100 zł - 23% vat',
    // daty i zegar
    '30.1', 'jutro', 'dziś', '17:00 + 3h', '5pm', 'za 4 godziny',
    'czas w Tokio', '5pm ldn in sf', 'ile dni do 25.12', '25 Dec', 'teraz',
    // czas czytelny i roboczy
    '3 h 20 min + 45 min', '1 h - 90 min', '90 s', '55h in workdays',
    // konwersje
    '1 TB w GB', '2 hours in minutes', '100 km/h na m/s', '2 in na px przy 96 ppi',
];

EXPRS.forEach(function (expr) {
    const r = api.evalCalcExpression(expr);
    if (!r || (r.value === null && r.text == null && !r.big)) {
        fail++; fails.push({ expr, why: 'wyrażenie wyjściowe nic nie zwraca' });
        return;
    }
    // DOKLADNIE to, co po znaku rownosci laduje w polu wyrazenia
    const shown = api.calcEqualsExprText(r);
    if (!shown) { fail++; fails.push({ expr, why: 'brak tekstu wracajacego do pola' }); return; }

    // …a teraz to samo, co widzi użytkownik w polu, wraca do silnika
    let back;
    try { back = api.evalCalcExpression(shown); } catch (e) { back = null; }
    const ok = back && (back.value !== null || back.text != null || back.big);
    if (ok) pass++;
    else { fail++; fails.push({ expr, why: 'nie odczytuje własnego wyniku', shown: shown }); }
});

// Odrębnie: wynik zegarowy i datowy MUSZĄ dać się odczytać nawet z opisem w nawiasie,
// a nawias MATEMATYCZNY nie może zostać zjedzony przy okazji.
const EXTRA = [
    ['20:00', true], ['07:05 (Tokio)', true], ['09:00 (SF)', true],
    ['30.1.2026 (piątek)', true], ['25 km²', true], ['3 kg/m³', true], ['5²', true],
    ['21.9.2026 14:30', true],    // data Z GODZINA - tak wyglada wynik 'teraz'
    ['32.9.2026 10:00', false],   // bledna data nadal odpada
    ['21.9.2026 25:00', false],   // bledna godzina nadal odpada
    ['192 px', true],
    ['5 px na cm', false],        // px zalezy od PPI - konwersja na cm NIE moze przejsc
    ['(2+3)*4', true],            // nawias matematyczny — nietknięty
    ['2 * (3 + 4)', true],
];
EXTRA.forEach(function (pair) {
    const r = api.evalCalcExpression(pair[0]);
    const got = !!(r && (r.value !== null || r.text != null || r.big));
    if (got === pair[1]) pass++;
    else { fail++; fails.push({ expr: pair[0], why: got ? 'miało NIE liczyć' : 'miało się policzyć' }); }
});

console.log('');
if (fail) {
    console.error('=== READBACK: ' + pass + '/' + (pass + fail) + ' PASS ===');
    for (const f of fails) {
        console.error('  ✗ ' + f.expr + ' — ' + f.why + (f.shown ? ' (w polu: "' + f.shown + '")' : ''));
    }
    process.exit(1);
}
console.log('  ✓ readback (silnik czyta własny wynik): ' + pass + '/' + pass + ' PASS');
process.exit(0);
