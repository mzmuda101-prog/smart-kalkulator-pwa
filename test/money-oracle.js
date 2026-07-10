// ============================================================
//  MONEY ORACLE — niezależny tor (math.js BigNumber) vs silnik aplikacji.
//  math.js TYLKO w testach (wzorcownia) — nie w bundle PWA (patrz ENGINE-STRATEGY).
//
//  Warstwy:
//   A) MATM0_MONEY vs math.js — helper decimal.js (roundMoney, VAT)
//   B) GOLDEN — znane wyrażenia VAT/% z smoke
//   C) fast-check — losowe brutto + stawka → netto / brutto / podatek
//
//  Uruchom: npm run test:money
// ============================================================
'use strict';

const { create, all } = require('mathjs');
const fc = require('fast-check');
const { api } = require('./_bootstrap');

const math = create(all, { number: 'BigNumber', precision: 40 });
const MONEY = global.window.MATM0_MONEY || {};
const RUNS = parseInt(process.env.PROP_RUNS || '400', 10);

let pass = 0, fail = 0;
const fails = [];

function near(a, b, tol) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= (tol != null ? tol : Math.max(1e-9, Math.abs(b) * 1e-9));
}

function oracleRound2(x) {
  return math.number(math.round(math.bignumber(x), 2));
}

function oracleVatNet(brutto, rate) {
  return math.number(math.divide(math.bignumber(brutto), math.add(1, math.divide(rate, 100))));
}

function oracleVatBrutto(net, rate) {
  return math.number(math.multiply(math.bignumber(net), math.add(1, math.divide(rate, 100))));
}

function oracleVatTax(amount, rate) {
  return math.number(math.multiply(math.bignumber(amount), math.divide(rate, 100)));
}

function check(tag, ok, detail) {
  if (ok) pass++;
  else { fail++; fails.push({ tag, ...detail }); }
}

// ── A) Helper MATM0_MONEY vs math.js oracle ─────────────────────────────────
if (!MONEY.available) {
  console.error('❌ MATM0_MONEY.available === false — brak decimal.js w bootstrapie');
  process.exit(2);
}

[
  ['roundMoney 0.1+0.2*100', () => MONEY.roundMoney(0.1 + 0.2), 0.3],
  ['vatNet 1560 @23%', () => MONEY.vatNetFromBrutto(1560, 23), oracleVatNet(1560, 23)],
  ['vatBrutto 1000 @23%', () => MONEY.vatBruttoFromNet(1000, 23), oracleVatBrutto(1000, 23)],
  ['vatTax 1000 @23%', () => MONEY.vatTax(1000, 23), oracleVatTax(1000, 23)],
  ['vatNet 1230 @8%', () => MONEY.vatNetFromBrutto(1230, 8), oracleVatNet(1230, 8)],
  ['roundMoney vatNet 1560', () => MONEY.roundMoney(MONEY.vatNetFromBrutto(1560, 23)), oracleRound2(oracleVatNet(1560, 23))],
].forEach(([tag, fn, want]) => {
  const got = fn();
  check('HELPER', near(got, want, 1e-9), { tag, want, got });
});

// ── B) GOLDEN — pipeline evalCalcExpression (VAT / %) ───────────────────────
function gold(expr, want, tol) {
  const r = api.evalCalcExpression(expr) || {};
  const ok = near(r.value, want, tol);
  check('GOLDEN', ok, { expr, want, got: r.value, unit: r.unit });
}

gold('1560 - vat', oracleVatNet(1560, 23), 1e-6);
gold('1000 + vat', oracleVatBrutto(1000, 23), 1e-6);
gold('brutto 1000', oracleVatBrutto(1000, 23), 1e-6);
gold('netto 1230', oracleVatNet(1230, 23), 1e-6);
gold('vat od 1000', oracleVatTax(1000, 23), 1e-6);
gold('50 - vat 20%', oracleVatNet(50, 20), 1e-6);
gold('50 + vat 20%', oracleVatBrutto(50, 20), 1e-6);
gold('brutto 1000 8%', oracleVatBrutto(1000, 8), 1e-6);
gold('netto 1230 8%', oracleVatNet(1230, 8), 1e-6);

// ── C) Property — losowe kwoty i stawki VAT (surowy float, jak silnik bez waluty) ─
const rateArb = fc.constantFrom(5, 8, 23);
const moneyArb = fc.integer({ min: 1, max: 999999 }).map(n => n / 100);

fc.assert(fc.property(moneyArb, rateArb, (brutto, rate) => {
  const want = oracleVatNet(brutto, rate);
  const r = api.evalCalcExpression(brutto + ' - vat ' + rate + '%') || {};
  if (!near(r.value, want, 1e-6)) {
    throw new Error('vat net: ' + brutto + ' @' + rate + '% want ' + want + ' got ' + r.value);
  }
}), { numRuns: RUNS });
pass += RUNS;

fc.assert(fc.property(moneyArb, rateArb, (net, rate) => {
  const want = oracleVatBrutto(net, rate);
  const r = api.evalCalcExpression('brutto ' + net + ' ' + rate + '%') || {};
  if (!near(r.value, want, 1e-6)) {
    throw new Error('vat brutto: ' + net + ' @' + rate + '% want ' + want + ' got ' + r.value);
  }
}), { numRuns: RUNS });
pass += RUNS;

fc.assert(fc.property(moneyArb, rateArb, (amount, rate) => {
  const want = oracleVatTax(amount, rate);
  const r = api.evalCalcExpression('vat ' + rate + '% od ' + amount) || {};
  if (!near(r.value, want, 1e-6)) {
    throw new Error('vat tax: ' + amount + ' @' + rate + '% want ' + want + ' got ' + r.value);
  }
}), { numRuns: RUNS });
pass += RUNS;

console.log(`\n=== MONEY ORACLE: ${pass} checks, ${fail} FAIL ===`);
if (fails.length) {
  fails.slice(0, 20).forEach(f => console.log('  ✗', f.tag, f.expr || f.tag, '| want:', f.want, '| got:', f.got));
  if (fails.length > 20) console.log('  … +' + (fails.length - 20) + ' more');
}
process.exit(fail ? 1 : 0);
