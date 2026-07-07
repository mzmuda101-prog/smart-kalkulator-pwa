// ============================================================
//  Regresja stref czasowych — czas/time, Raycast-style „in <miasto>"
//  Kotwica „teraz": 1.7.26 14:35 (środa) lokalnie w Node.
//  Uruchom: node test/timezone-regression.js
// ============================================================
'use strict';
const { api } = require('./_bootstrap');
const parser = global.window.MATM0_PARSER;

parser.setTodayForTests(new Date(2026, 6, 1, 0, 0, 0, 0));
parser.setNowForTests(new Date(2026, 6, 1, 14, 35, 0, 0));

function text(expr) {
  try { return (api.evalCalcExpression(expr) || {}).text; } catch (e) { return 'ERR'; }
}
function kind(expr) {
  try { return (api.evalCalcExpression(expr) || {}).kind; } catch (e) { return 'ERR'; }
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++; else { fail++; fails.push(msg); }
}

// czas/time = teraz (lokalny moment z datą)
ok(text('czas') === text('teraz'), 'czas = teraz');
ok(text('time') === text('now'), 'time = now');
ok(kind('czas') === 'date', 'czas → kind date');
ok(kind('time in Kyoto') === 'clock', 'time in Kyoto → clock');

// Raycast-style zapytania o godzinę w mieście
['czas w Tokio', 'time in Tokyo', 'time in Kyoto', 'czas w/in Kioto', 'czas w Warszawie', 'time in Warsaw'].forEach(function (ex) {
  ok(/^\d{2}:\d{2} \(.+\)$/.test(text(ex)), ex + ' → HH:MM (Miasto) | got: ' + text(ex));
});
// Skrót „teraz <miasto>" / „teraz w <miasto>" (chipy live-hint sugerują „w Tokio")
['teraz NYC', 'Teraz NYC', 'teraz Tokyo', 'teraz Kyoto', 'teraz w Tokio', 'now in NYC', 'teraz w Kioto'].forEach(function (ex) {
  ok(/^\d{2}:\d{2} \(.+\)$/.test(text(ex)), ex + ' → HH:MM (Miasto) | got: ' + text(ex));
});
ok(kind('teraz - 2 dni') === 'date', 'teraz - 2 dni nadal datą, nie strefą');
// T1-5 — skróty lotnisk i kolejne miasta PL/EU
['time in CDG', 'czas w Gdańsku', 'time in FRA', 'time in AMS', 'czas w Poznaniu'].forEach(function (ex) {
  ok(/^\d{2}:\d{2} \(.+\)$/.test(text(ex)), ex + ' → HH:MM (Miasto) | got: ' + text(ex));
});

// Konwersja zegara między strefami (offset zależy od DST — tylko format + sens)
var conv = text('17:00 w Londynie na Tokio');
ok(/^\d{2}:\d{2} \(Tokio\)$/.test(conv), '17:00 w Londynie na Tokio | got: ' + conv);

// „time in 3 weeks" NIE jest strefą (parser dat)
ok(kind('time in 3 weeks') !== 'clock' || text('time in 3 weeks') == null,
  'time in 3 weeks nie myli się ze strefą');

console.log('  ' + (fail ? '✗' : '✓') + ' timezone-regression: ' + pass + '/' + (pass + fail) + ' PASS');
if (fails.length) fails.forEach(function (f) { console.log('  ✗', f); });
parser.clearTodayForTests();
parser.clearNowForTests();
console.log('\n=== timezone-regression: ' + (fail ? 'FAIL' : 'OK') + ' ===');
process.exit(fail ? 1 : 0);
