// ============================================================
//  ENGINE DEBUG — opts.debug w MATM0_PARSER.evaluate (P2 audytu).
//  Bez debug: ciche {} jak dotąd. Z debug: _debugCode + _debugDetail.
//
//  Uruchom: npm run test:debug
// ============================================================
'use strict';

const { api } = require('./_bootstrap');

let pass = 0;
let fail = 0;
const fails = [];

function check(tag, ok, detail) {
  if (ok) pass++;
  else { fail++; fails.push({ tag, ...detail }); }
}

function evalDbg(expr, extra) {
  return api.evalCalcExpression(expr, Object.assign({ debug: true }, extra || {}));
}

function evalSilent(expr) {
  return api.evalCalcExpression(expr) || {};
}

// FX dla miks waluta+fizyczna
api.state.fx.rates = { PLN: 1, EUR: 4.30 };
api.state.fx.ts = Date.now();

// ── Bez debug — brak pól diagnostycznych ────────────────────────────────────
{
  const r = evalSilent('10 pln × 5 km');
  check('silent', r.value == null && r._debugCode == null, { got: r });
}

// ── Z debug — kody przyczyn ─────────────────────────────────────────────────
check('empty_input', evalDbg('   ')._debugCode === 'empty_input', { got: evalDbg('   ') });
check('unit_mix', evalDbg('10 pln × 5 km')._debugCode === 'unit_mix', { got: evalDbg('10 pln × 5 km') });
check('parse_error', evalDbg('sin(')._debugCode === 'parse_error' && !!evalDbg('sin(')._debugDetail, {
  got: evalDbg('sin('),
});

// firstUnitWins → unit_mix nie blokuje
const firstWin = evalDbg('10 pln × 5 km', { firstUnitWins: true });
check('firstUnitWins bypass', firstWin._debugCode == null && firstWin.value === 50, { got: firstWin });

// baseline ścieżka bez debug — wynik jak przed P2
check('baseline parity', evalSilent('2+2').value === 4 && evalSilent('sin(').value == null, {
  ok2: evalSilent('2+2').value,
  bad: evalSilent('sin('),
});

console.log(`\n=== ENGINE DEBUG: ${pass} checks, ${fail} FAIL ===`);
if (fails.length) {
  console.log('\nNIEPRZESZŁE:');
  fails.forEach((f) => console.log('  ✗', `[${f.tag}]`, JSON.stringify(f)));
}
process.exit(fail ? 1 : 0);
