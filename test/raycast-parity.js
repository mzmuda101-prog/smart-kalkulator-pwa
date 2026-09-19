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
matches('17:00 w Londynie na Tokio', /^\d{2}:\d{2} \(Tokio\)$/);

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

console.log('');
if (fail) {
    console.error('=== RAYCAST-PARITY: ' + pass + '/' + (pass + fail) + ' PASS ===');
    for (const f of fails) console.error('  ✗ ' + f.expr + ' | chcę: ' + f.want + ' | mam: ' + f.got);
    process.exit(1);
}
console.log('  ✓ raycast-parity: ' + pass + '/' + pass + ' PASS');
process.exit(0);
