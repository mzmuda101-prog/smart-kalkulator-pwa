// ============================================================
//  NOTEPAD ORACLE — niezależny tor vs evalNotepadLines (app.js).
//  GOLDEN: znane scenariusze domeny PL (razem, @vars, sekcje).
//  INVARIANT: fast-check — suma pozycji = razem, reset po ---.
//  FORMAT: prefixy wyrównania + markery inline nie psują eval.
//
//  Uruchom: npm run test:notepad
// ============================================================
'use strict';

const fc = require('fast-check');
const { api } = require('./_bootstrap');

const FX = { PLN: 1, EUR: 4.30, USD: 4.00, GBP: 5.00 };
const RUNS = parseInt(process.env.PROP_RUNS || '200', 10);

let pass = 0;
let fail = 0;
const fails = [];

function near(a, b, tol) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  if (!isFinite(a) || !isFinite(b)) return a === b;
  return Math.abs(a - b) <= (tol != null ? tol : Math.max(1e-9, Math.abs(b) * 1e-9));
}

function check(tag, ok, detail) {
  if (ok) pass++;
  else fail++;
  if (!ok) fails.push({ tag, ...detail });
}

function np(text) {
  return api.evalNotepadLines(text);
}

function saveEnv() {
  return {
    fx: Object.assign({}, api.state.fx.rates),
    fxTs: api.state.fx.ts,
    settings: Object.assign({}, api.state.settings),
    constants: JSON.parse(JSON.stringify(api.state.constants || [])),
  };
}

function restoreEnv(saved) {
  api.state.fx.rates = Object.assign({}, saved.fx);
  api.state.fx.ts = saved.fxTs;
  api.state.settings = Object.assign({}, saved.settings);
  api.state.constants = saved.constants;
}

function seedFx() {
  api.state.fx.rates = Object.assign({}, FX);
  api.state.fx.ts = Date.now();
  api.state.fx.error = null;
}

function itemSum(lines) {
  return lines
    .filter((l) => l && l.isItem && typeof l.value === 'number')
    .reduce((s, l) => s + l.value, 0);
}

const env0 = saveEnv();
seedFx();

// ── GOLDEN — oracle liczy sumę niezależnie od silnika ───────────────────────
function gold(tag, text, idx, want, opts) {
  opts = opts || {};
  const lines = np(text);
  const row = lines[idx];
  const got = row ? row.value : undefined;
  let ok;
  if (opts.empty) {
    ok = row && row.text === '' && got == null;
  } else if (opts.exact === false) {
    ok = got !== want;
  } else if (want == null) {
    ok = got == null;
  } else {
    ok = near(got, want, opts.tol);
  }
  check('GOLDEN', ok, { tag, text: text.replace(/\n/g, ' | '), idx, want, got, textOut: row && row.text });
}

gold('razem suma surowych', 'A: 100\nB: 200\nC: 34\nrazem', 3, 334);
gold('półsuma bez pozycji w sumie', 'X: 100\nY: 50\npółsuma', 2, 150);
gold('sekcja reset', 'A: 10\nB: 20\n---\nC: 5\nrazem', 4, 5);
gold('nagłówek prozy bez wyniku', 'Wyjazd w góry\nA: 1', 0, null, { empty: true });
gold('@zmienna lokalna', 'Budżet: 5000\nKoszt: 100 + 194\nZostało: @budżet - @koszt', 2, 4706);
gold('@def nie wlicza do razem', '@stawka: 50\nKoszt: @stawka * 3\nrazem', 2, 150);

// waluty + razem(zł) / inherit
const savedSum = api.state.settings.notepadSumUnit;
const savedMix = api.state.settings.notepadUnitMix;
api.state.settings.notepadUnitMix = 'first';
api.state.settings.notepadSumUnit = 'inherit';
gold('razem inherit zł', 'Nocleg: 110pln×10os\npaliwo: 5,60pln×100km\nrazem', 2, 1660);
api.state.settings.notepadSumUnit = 'off';
gold('razem bez jednostki (off)', 'A: 100 zł\nB: 50 zł\nrazem', 2, 150);
api.state.settings.notepadSumUnit = savedSum;
api.state.settings.notepadUnitMix = savedMix;

// ── FORMAT — markery i prefixy nie zmieniają eval ───────────────────────────
gold('bold strip', '**Paliwo**: 100 + 194', 0, 294);
gold('align center', '< Nocleg: 3 * 180', 0, 540);
gold('align right razem', 'A: 10\nB: 20\n> razem', 2, 30);

// ── INVARIANT A: itemSum(lines) === razem.value ─────────────────────────────
try {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 1, max: 50000 }), { minLength: 2, maxLength: 12 }),
      (nums) => {
        const body = nums.map((n, i) => `L${i + 1}: ${n}`).join('\n') + '\nrazem';
        const lines = np(body);
        const total = lines[lines.length - 1];
        const oracle = nums.reduce((a, b) => a + b, 0);
        return total && total.isTotal && near(total.value, oracle) && near(itemSum(lines), oracle);
      }
    ),
    { numRuns: RUNS }
  );
  check('INVARIANT', true, { tag: 'razem = suma pozycji', runs: RUNS });
} catch (e) {
  check('INVARIANT', false, { tag: 'razem = suma pozycji', err: String(e) });
}

// ── INVARIANT B: --- resetuje sumę ──────────────────────────────────────────
try {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 2, maxLength: 6 }),
      fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 4 }),
      (before, after) => {
        const head = before.map((n, i) => `A${i}: ${n}`).join('\n');
        const tail = after.map((n, i) => `B${i}: ${n}`).join('\n') + '\nrazem';
        const lines = np(head + '\n---\n' + tail);
        const total = lines[lines.length - 1];
        const oracle = after.reduce((a, b) => a + b, 0);
        return total && near(total.value, oracle);
      }
    ),
    { numRuns: Math.min(RUNS, 120) }
  );
  check('INVARIANT', true, { tag: 'sekcja --- reset sumy', runs: Math.min(RUNS, 120) });
} catch (e) {
  check('INVARIANT', false, { tag: 'sekcja --- reset sumy', err: String(e) });
}

// ── INVARIANT C: @nazwa po definicji etykiety ───────────────────────────────
try {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 99 }),
      (base, mul) => {
        const text = `Cena: ${base}\nRazem: @cena * ${mul}`;
        const lines = np(text);
        return lines[1] && near(lines[1].value, base * mul);
      }
    ),
    { numRuns: RUNS }
  );
  check('INVARIANT', true, { tag: '@etykieta po definicji', runs: RUNS });
} catch (e) {
  check('INVARIANT', false, { tag: '@etykieta po definicji', err: String(e) });
}

// ── INVARIANT D: odporność — notatnik nie rzuca ─────────────────────────────
try {
  fc.assert(
    fc.property(fc.string({ minLength: 0, maxLength: 80 }), (raw) => {
      const lines = np(raw);
      return Array.isArray(lines);
    }),
    { numRuns: RUNS }
  );
  check('INVARIANT', true, { tag: 'odporność na losowy tekst', runs: RUNS });
} catch (e) {
  check('INVARIANT', false, { tag: 'odporność na losowy tekst', err: String(e) });
}

// ── META: razem w działaniu = runningSum w resolved ─────────────────────────
{
  const text = 'A: 10\nB: 20\nKoszt: razem + 5';
  const lines = np(text);
  const row = lines[2];
  check('META', row && near(row.value, 35), { tag: 'razem w wyrażeniu', want: 35, got: row && row.value });
}

restoreEnv(env0);

// ── Raport ──────────────────────────────────────────────────────────────────
console.log(`\n=== NOTEPAD ORACLE: ${pass} checks, ${fail} FAIL ===`);
if (fails.length) {
  console.log('\nNIEPRZESZŁE:');
  fails.forEach((f) => console.log('  ✗', `[${f.tag}]`, JSON.stringify(f)));
}
process.exit(fail ? 1 : 0);
