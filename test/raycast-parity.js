// ============================================================
//  PARYTET Z RAYCASTEM — formy zapisu, które Raycast rozumie, a my dotąd nie.
//  Źródło przykładów: manual.raycast.com/calculator (wrzesień 2026).
//
//  Pilnuje też DWUJĘZYCZNOŚCI: apka reklamuje parser PL/EN, a część funkcji
//  działała wyłącznie po polsku (miesiące, jednostki czasu).
//
//  Uruchom:  node test/raycast-parity.js   (albo npm run test:parity)
//  Kod 0 = OK, 1 = niepowodzenia.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

let pass = 0, fail = 0;
const fails = [];
function got(expr) {
    const r = api.evalCalcExpression(expr) || {};
    if (r.text != null) return String(r.text);
    if (r.value == null) return '∅';
    return String(r.value) + (r.unit ? ' ' + r.unit : '');
}
function eq(expr, want) {
    const g = got(expr);
    if (g === want) pass++; else { fail++; fails.push({ expr, want, got: g }); }
}
function matches(expr, re) {
    const g = got(expr);
    if (re.test(g)) pass++; else { fail++; fails.push({ expr, want: String(re), got: g }); }
}

// ── Zegar 12-godzinny (am/pm) ──
eq('5pm', '17:00');
eq('3:45pm', '15:45');
eq('12am', '00:00');
eq('12pm', '12:00');
eq('3:45pm + 5', '20:45');          // goła liczba przy godzinie = GODZINY
eq('5pm - 90 min', '15:30');

// ── Strefy: godzina w mieście A wyrażona w mieście B ──
matches('5pm ldn in sf', /^\d{2}:\d{2} \(SF\)$/);
matches('17:00 w Londynie na Tokio', /^\d{2}:\d{2} \(Tokio(, jutro)?\)$/);

// ── Czas względny wobec TERAZ (nie mylić z datami: „za 3 tygodnie" to data) ──
matches('za 4 godziny', /^\d{2}:\d{2}( \(jutro\))?$/);
matches('time in 4 hours', /^\d{2}:\d{2}( \(jutro\))?$/);
matches('in 4 hours', /^\d{2}:\d{2}( \(jutro\))?$/);
matches('4 hours ago', /^\d{2}:\d{2}( \(wczoraj\))?$/);
matches('za 3 tygodnie', /^\d{1,2}\.\d{1,2}\.\d{4} \(/);   // to DATA, nie godzina
matches('za 3 dni', /^\d{1,2}\.\d{1,2}\.\d{4} \(/);

// ── Angielskie miesiące + kolejność „miesiąc dzień" ──
matches('25 Dec', /^25\.12\.\d{4} \(/);
matches('August 5', /^5\.8\.\d{4} \(/);
matches('August 5 + 5', /^10\.8\.\d{4} \(/);               // goła liczba przy dacie = DNI
matches('days until 25 Dec', /^\d+ dni$/);
// …a zwykła arytmetyka dziesiętna NIE może stać się datą
eq('2.5 + 5', '7.5');
eq('1.5 + 2', '3.5');

// ── Jednostki czasu po angielsku + odmiana polska w celu konwersji ──
eq('2 hours in minutes', '120 min');
eq('2 godziny w minutach', '120 min');
eq('2 days in hours', '48 h');
eq('1 week in days', '7 dni');
eq('5 km w metrach', '5000 m');
eq('2 kg w gramach', '2000 g');

// ── Czytelny czas na życzenie ──
eq('145 mins to timespan', '2 h 25 min');
eq('145 min czytelnie', '2 h 25 min');

// ── Czas roboczy (pn–pt, 8 h/dzień, bez świąt — założenie jest w wyniku) ──
eq('55h in workdays', '6,88 dni roboczych (po 8 h)');
eq('55h w dniach roboczych', '6,88 dni roboczych (po 8 h)');
eq('workdays in 2026', '261 dni roboczych (pn–pt, bez świąt)');
eq('dni robocze w 2026', '261 dni roboczych (pn–pt, bez świąt)');
matches('workhours in 2026', /^2[\s\u00a0\u202f]088 h \(261 dni × 8 h, pn–pt, bez świąt\)$/); // spacja tysięcy = niełamliwa

// ── PPI po angielsku ──
eq('2 inches in px at 72 ppi', '144 px');
eq('2 cale na px przy 72 ppi', '144 px');

// ── Tolerancja wejścia: „=", urwany operator, niedomknięty nawias ──
eq('2 + 2 =', '4');
eq('12 * ', '12');
eq('((2+3', '5');

// ════════ Raycast 2.12 (listopad 2026) ════════

// ── Konwersja liczy CAŁE wyrażenie, ze znakiem (wcześniej: suma literałów bez minusa) ──
eq('-2 h na min', '-120 min');
eq('-5 km in m', '-5000 m');
eq('10 km - 15 km na m', '-5000 m');
eq('2 h * 3 na min', '360 min');
eq('(2 h + 1 h) * 3 na min', '540 min');
eq('3 h 20 min na min', '200 min');

// ── Pieniądze: napiwek dodaje, rabat odejmuje, VAT zawarty, podział rachunku ──
eq('15% tip on 80', '92');
eq('15% napiwku od 80 zł', '92 zł');
eq('25% off 60 split 3', '15');
eq('25% rabatu od 60 zł na 3 osoby', '15 zł');
eq('120 zł podziel na 4', '30 zł');
eq('20% vat in 120', '20');
eq('23% vat w 123 zł', '23 zł');
eq('15% decrease from 813', '691.05');
eq('15% mniej od 813', '691.05');
eq('10% więcej od 200 zł', '220 zł');
eq('5 km na m', '5000 m');                 // „na” jako konwersja dalej działa (nie podział)

// ── Funkcje z kilkoma argumentami (; albo przecinek ze spacją) ──
eq('round(23.456, 1)', '23.5');
eq('round(23,456; 2)', '23.46');
eq('sum(1, 2, 3)', '6');
eq('suma(1; 2; 3)', '6');
eq('max(3; 7; 2)', '7');
eq('min(3; 7; 2)*2', '4');
eq('średnia(2; 4)', '3');
eq('max(2 h 30 min; 200 min)', '3 h 20 min');
eq('exp(1)', '2.71828182845905');    // „exp(” nie może stać się „e·xp(”
eq('2(3+1)', '8');

// ── Zaokrąglanie do kroku, ułamki, systemy liczbowe ──
eq('3.3 to nearest quarter', '3.25');
eq('3,3 do najbliższej ćwiartki', '3.25');
eq('zaokrąglij 23,456 do 1 miejsca', '23.5');
eq('zaokrąglij 1234 do setek', '1200');
eq('1.75 as improper', '7/4');
eq('1,75 jako ułamek', '7/4');
eq('1,75 jako liczba mieszana', '1 3/4');
eq('1/3 + 1/6 jako ułamek', '1/2');
eq('pi jako ułamek', 'brak dokładnego ułamka');
eq('255 na hex', '0xFF');
eq('255 na bin', '0b11111111');
eq('255 w systemie 36', '73 (system 36)');
eq('0xff', '255');
eq('0b1010 + 1', '11');

// ── Strefy: skróty, arytmetyka na czasie w mieście, data tamtego miejsca ──
matches('4:00 PT in UTC', /^\d{2}:00 \(UTC\)$/);
matches('16:00 CET na UTC', /^15:00 \(UTC\)$/);
matches('czas w Tokio + 4', /^\d{2}:\d{2} \(Tokio(, jutro)?\)$/);
matches('time in Brisbane + 4', /^\d{2}:\d{2} \(Brisbane(, jutro)?\)$/);
matches('1:00 w Tokio na Londyn', /^16:00 \(Londyn, wczoraj\)$/);
matches('czas w Los Angeles', /\(Los Angeles/);

// ── Nauka: tempo, transfer, stałe, nuty, masa molowa ──
eq('5:00 min/km na km/h', '12 km/h');
eq('12 km/h na tempo', '5:00 min/km');
eq('10 km w tempie 5:00', '50 min');
eq('transfer 1 TB at 100 Mbps', '22 h 13 min');
eq('4 GB przy 50 MB/s', '1 min 20 s');
eq('speed of light in km/s', '299792.458 km/s');
eq('prędkość dźwięku na km/h', '1234.8 km/h');
eq('a4 na hz', '440 Hz');
eq('c4 to hz', '261.63 Hz');
eq('440 hz na nutę', 'A4');
eq('masa molowa C6H12O6', '180,156 g/mol');
eq('molar mass of Ca(OH)2', '74,092 g/mol');

// ── Ile zostało / ile minęło / tydzień — „dziś” przypięte na sobotę 14.11.2026 17:00 ──
{
    const P = global.window.MATM0_PARSER;
    P.setTodayForTests(new Date(2026, 10, 14));
    P.setNowForTests(new Date(2026, 10, 14, 17, 0, 0));
    eq('ile dni do końca miesiąca', '16 dni');
    eq('days left in this month', '16 dni');
    eq('ile dni zostało do końca roku', '47 dni');
    eq('ile dni do końca tygodnia', '1 dzień');
    eq('ile godzin do końca dnia', '7 h');
    eq('hours left in today', '7 h');
    matches('godziny do konca roku', /^1[\s\u00a0\u202f]135 h$/);   // 47 dni + 7 h, w godzinach (nie „6 tyg 5 dni”)
    eq('minutes left in today', '420 min');
    eq('days since march', '258 dni');
    eq('dni od marca', '258 dni');
    eq('week 44 2026', '26.10.2026 (poniedziałek) – 1.11.2026 (niedziela)');
    eq('tydzień 1 2026', '29.12.2025 (poniedziałek) – 4.1.2026 (niedziela)');
    eq('który tydzień', 'tydzień 46 (2026)');
    eq('numer tygodnia 25.12.2026', 'tydzień 52 (2026)');
    eq('ile do 18:30', '1 h 30 min');
    eq('until 3pm', '22 h');
    eq('ile dni do piątku', '6 dni');
    eq('days until friday', '6 dni');
    eq('do soboty', '7 dni');
    P.clearTodayForTests(); P.clearNowForTests();
}

console.log('');
if (fail) {
    console.error('=== RAYCAST-PARITY: ' + pass + '/' + (pass + fail) + ' PASS ===');
    for (const f of fails) console.error('  ✗ ' + f.expr + ' | chcę: ' + f.want + ' | mam: ' + f.got);
    process.exit(1);
}
console.log('  ✓ raycast-parity: ' + pass + '/' + pass + ' PASS');
process.exit(0);
