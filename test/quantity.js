// ============================================================
//  Testy jednostkowe FUNDAMENTU typowanej wielkości (js/smart-quantity.js).
//  Czysty moduł — ładujemy go z atrapą window.MATM0_DATA (z data-tables.js).
//  Uruchom:  node test/quantity.js   (albo npm run test:qty)
//  Kod 0 = wszystko PASS, 1 = są niepowodzenia.
// ============================================================
'use strict';
const path = require('path');

// smart-quantity czyta window.MATM0_DATA — ustaw atrapę okna PRZED załadowaniem danych.
global.window = {};
require(path.join(__dirname, '..', 'js', 'data-tables.js')); // ustawia window.MATM0_DATA
const Q = require(path.join(__dirname, '..', 'js', 'smart-quantity.js'));

let pass = 0, fail = 0;
const fails = [];
function ok(label, cond, got) {
    if (cond) { pass++; } else { fail++; fails.push({ label, got }); }
}
function near(a, b, eps) { return typeof a === 'number' && Math.abs(a - b) <= (eps || 1e-9); }
// skrót: sprawdź kind + (przybliżoną) wartość kanoniczną
function isKV(label, q, kind, value, eps) {
    ok(label, q && q.kind === kind && (value === undefined || near(q.value, value, eps)),
        q ? (q.kind + '/' + q.value + (q.reason ? '/' + q.reason : '')) : String(q));
}

// ── Fabryki / konwersja do bazy ──────────────────────────────────────────────
isKV('physical 5 km → baza 5 000 000 mm', Q.physical(5, 'km'), 'physical', 5000000);
isKV('physical 300 m → 300 000 mm', Q.physical(300, 'm'), 'physical', 300000);
isKV('physical 2 kg → 2000 g', Q.physical(2, 'kg'), 'physical', 2000);
isKV('physical „time" → duration (5 min = 300 s)', Q.physical(5, 'min'), 'duration', 300);
isKV('physical nieznana jednostka → invalid', Q.physical(5, 'flos'), 'invalid');
isKV('duration 90 min konstruktor (3600+? )', Q.duration(5400), 'duration', 5400);

// ── Dodawanie / odejmowanie: ten sam wymiar ─────────────────────────────────
isKV('5 km + 300 m = 5 300 000 mm', Q.add(Q.physical(5, 'km'), Q.physical(300, 'm')), 'physical', 5300000);
isKV('2 kg + 300 g = 2300 g', Q.add(Q.physical(2, 'kg'), Q.physical(300, 'g')), 'physical', 2300);
isKV('5 km + 2 kg → invalid (różny wymiar)', Q.add(Q.physical(5, 'km'), Q.physical(2, 'kg')), 'invalid');
isKV('2 + 2 = 4', Q.add(Q.num(2), Q.num(2)), 'number', 4);
isKV('2h + 30 min = 9000 s', Q.add(Q.physical(2, 'h'), Q.physical(30, 'min')), 'duration', 9000);

// ── Pieniądze ────────────────────────────────────────────────────────────────
isKV('20 EUR + 10 EUR = 30 EUR', Q.add(Q.money(20, 'EUR'), Q.money(10, 'EUR')), 'money', 30);
ok('20 EUR + 10 EUR → unit EUR', Q.add(Q.money(20, 'EUR'), Q.money(10, 'EUR')).unit === 'EUR');
isKV('12 PLN + 20 EUR → needs-rate', Q.add(Q.money(12, 'PLN'), Q.money(20, 'EUR')), 'invalid');
ok('różne waluty → reason needs-rate', Q.add(Q.money(12, 'PLN'), Q.money(20, 'EUR')).reason === 'needs-rate');

// ── Procent (reguła „od lewej bazy") ────────────────────────────────────────
isKV('537 + 12% = 601,44', Q.add(Q.num(537), Q.percent(12)), 'number', 601.44, 1e-6);
isKV('100 + 10% + 10% = 121', Q.add(Q.add(Q.num(100), Q.percent(10)), Q.percent(10)), 'number', 121);
isKV('100 + 20 + 10% = 132', Q.add(Q.add(Q.num(100), Q.num(20)), Q.percent(10)), 'number', 132);
isKV('1000 zł + 10% = 1100 zł', Q.add(Q.money(1000, 'PLN'), Q.percent(10)), 'money', 1100);
ok('1000 zł + 10% zostaje walutą PLN', Q.add(Q.money(1000, 'PLN'), Q.percent(10)).unit === 'PLN');
isKV('1560 − ... : 100 − 23% = 77', Q.sub(Q.num(100), Q.percent(23)), 'number', 77);
isKV('10% + 10% = 20% (percent+percent)', Q.add(Q.percent(10), Q.percent(10)), 'percent', 20);

// ── Mnożenie / dzielenie ─────────────────────────────────────────────────────
isKV('3 × 180 zł = 540 zł', Q.mul(Q.num(3), Q.money(180, 'PLN')), 'money', 540);
isKV('180 zł × 3 = 540 zł', Q.mul(Q.money(180, 'PLN'), Q.num(3)), 'money', 540);
isKV('834 zł ÷ 5 = 166,8 zł', Q.div(Q.money(834, 'PLN'), Q.num(5)), 'money', 166.8, 1e-9);
isKV('100 × 50% = 50', Q.mul(Q.num(100), Q.percent(50)), 'number', 50);
isKV('12% × 100 = 12', Q.mul(Q.percent(12), Q.num(100)), 'number', 12);
isKV('100 ÷ 50% = 200', Q.div(Q.num(100), Q.percent(50)), 'number', 200);
isKV('10 km ÷ 2 km = 5 (stosunek)', Q.div(Q.physical(10, 'km'), Q.physical(2, 'km')), 'number', 5);
isKV('5 km × 2 km → invalid (brak jednostek złożonych)', Q.mul(Q.physical(5, 'km'), Q.physical(2, 'km')), 'invalid');
isKV('3 × 5 km = 15 km (15 000 000 mm)', Q.mul(Q.num(3), Q.physical(5, 'km')), 'physical', 15000000);

// ── Zegar (clock) i czas trwania ─────────────────────────────────────────────
isKV('12:30 (750) + 300 s = 12:35 (755)', Q.add(Q.clock(750), Q.duration(300)), 'clock', 755);
isKV('17:00 (1020) + 3h = 20:00 (1200)', Q.add(Q.clock(1020), Q.duration(3 * 3600)), 'clock', 1200);
isKV('23:00 (1380) + 3h = 02:00 (120) — zawijanie doby', Q.add(Q.clock(1380), Q.duration(3 * 3600)), 'clock', 120);
isKV('17:00 − 9:30 = 7h30 (27000 s)', Q.sub(Q.clock(1020), Q.clock(570)), 'duration', 27000);
isKV('od 9:30 do 17:00 (range) = 27000 s', Q.range(Q.clock(570), Q.clock(1020)), 'duration', 27000);

// ── Daty ─────────────────────────────────────────────────────────────────────
(function () {
    var d1 = Q.date(new Date(2026, 0, 1).getTime());  // 1.01.2026
    var d2 = Q.date(new Date(2026, 1, 1).getTime());  // 1.02.2026
    isKV('1.02 − 1.01 = 31 dni (2 678 400 s)', Q.sub(d2, d1), 'duration', 31 * 86400);
    var plus = Q.add(d1, Q.num(90)); // + 90 dni
    ok('1.01.2026 + 90 dni → data', plus.kind === 'date');
    ok('1.01.2026 + 90 dni = 1.04.2026', plus.kind === 'date' && new Date(plus.value).getMonth() === 3 && new Date(plus.value).getDate() === 1, plus.value);
})();

// ── Konwersja („na") i wyświetlanie ─────────────────────────────────────────
(function () {
    var c = Q.convert(Q.physical(5, 'km'), 'm');
    isKV('5 km na m → physical (baza bez zmian)', c, 'physical', 5000000);
    ok('5 km na m → toDisplay 5000 m', (function () { var d = Q.toDisplay(c); return near(d.value, 5000) && d.unit === 'm'; })());
    isKV('5 km na kg → invalid (dim-mismatch)', Q.convert(Q.physical(5, 'km'), 'kg'), 'invalid');
    isKV('10 EUR na PLN → needs-rate', Q.convert(Q.money(10, 'EUR'), 'PLN'), 'invalid');
    var disp = Q.toDisplay(Q.add(Q.physical(5, 'km'), Q.physical(300, 'm')), 'km');
    ok('(5 km + 300 m) w km = 5,3', near(disp.value, 5.3), disp && disp.value);
})();

// ── Autodobór czytelnej jednostki ────────────────────────────────────────────
(function () {
    function ad(q) { return Q.autoDisplay(q); }
    var a1 = ad(Q.add(Q.physical(5, 'km'), Q.physical(300, 'm'))); // 5 300 000 mm
    ok('autodobór: 5 km + 300 m → 5,3 km', a1 && near(a1.value, 5.3) && a1.unit === 'km', a1 && (a1.value + ' ' + a1.unit));
    var a2 = ad(Q.physical(1500, 'mm'));
    ok('autodobór: 1500 mm → 1,5 m', a2 && near(a2.value, 1.5) && a2.unit === 'm', a2 && (a2.value + ' ' + a2.unit));
    var a3 = ad(Q.physical(500, 'mm'));
    ok('autodobór: 500 mm → 50 cm', a3 && near(a3.value, 50) && a3.unit === 'cm', a3 && (a3.value + ' ' + a3.unit));
    var a4 = ad(Q.physical(2500, 'g'));
    ok('autodobór: 2500 g → 2,5 kg', a4 && near(a4.value, 2.5) && a4.unit === 'kg', a4 && (a4.value + ' ' + a4.unit));
    var a5 = ad(Q.duration(5400)); // 90 min
    ok('autodobór: 5400 s → 1,5 h', a5 && near(a5.value, 1.5) && a5.unit === 'h', a5 && (a5.value + ' ' + a5.unit));
    var a6 = ad(Q.physical(2e9, 'B')); // 2 GB w bajtach (SI: 1 GB = 1e9 B)
    ok('autodobór: 2 GB (bajty) → 2 GB', a6 && near(a6.value, 2) && a6.unit === 'GB', a6 && (a6.value + ' ' + a6.unit));
    ok('chooseUnit: 0 → pierwsza w drabince (mm)', Q.chooseUnit('length', 0) === 'mm');
})();

// ── Propagacja invalid ───────────────────────────────────────────────────────
isKV('invalid propaguje przez add', Q.add(Q.invalid('x'), Q.num(2)), 'invalid');
isKV('invalid propaguje przez mul', Q.mul(Q.num(2), Q.invalid('x')), 'invalid');

// ── Raport ───────────────────────────────────────────────────────────────────
console.log('  ' + (fail ? '✗' : '✓') + ' smart-quantity: ' + pass + '/' + (pass + fail) + ' PASS');
if (fails.length) {
    console.log('\nNIEPRZESZŁE:');
    fails.forEach(function (f) { console.log('  ✗', f.label, '| got:', f.got); });
}
process.exit(fail ? 1 : 0);
