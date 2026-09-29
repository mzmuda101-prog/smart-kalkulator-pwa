// ============================================================
//  PLACEHOLDER NIE MOŻE KŁAMAĆ.
//
//  Pole wyrażenia rotuje przykładami („np. 100 zł + 23% vat") — to teraz
//  główna witryna możliwości silnika. Jeśli którykolwiek przykład przestanie
//  się liczyć, apka reklamuje funkcję, której nie ma: użytkownik przepisuje
//  to, co widzi, i dostaje „—".
//
//  Ten test pilnuje, że KAŻDY przykład z CALC_PH_EXAMPLES zwraca wynik.
//
//  Uruchom:  node test/placeholder-examples.js
//  Kod 0 = OK, 1 = niepowodzenia.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

const examples = api.calcPlaceholderExamples;

let pass = 0, fail = 0;
const fails = [];

if (!Array.isArray(examples) || !examples.length) {
  console.error('❌ Brak api.calcPlaceholderExamples — eksport z app.js zniknął?');
  process.exit(1);
}

for (const expr of examples) {
  let res = null, err = null;
  try { res = api.evalCalcExpression(expr); } catch (e) { err = e; }
  const out = res && (res.text || (res.value != null ? String(res.value) : null));
  if (err || !out) {
    fail++;
    fails.push({ expr, why: err ? err.message : 'pusty wynik' });
  } else {
    pass++;
    console.log(`  ✓ ${expr.padEnd(24)} → ${out}`);
  }
}

// Placeholder jest CIASNY — długie przykłady lecą w marquee i gorzej się czytają.
const MAX_LEN = 24;
for (const expr of examples) {
  if (expr.length > MAX_LEN) {
    fail++;
    fails.push({ expr, why: `za długi (${expr.length} > ${MAX_LEN} znaków)` });
  }
}

console.log(`\nplaceholder-examples: ${pass} ok, ${fail} błędów`);
if (fail) {
  for (const f of fails) console.error(`  ✗ ${f.expr} — ${f.why}`);
  process.exit(1);
}
process.exit(0);
