// ============================================================
//  Parytet PL · EN — każda para musi dać ten sam rodzaj wyniku.
//  Uruchom: node test/help-bilingual.js
// ============================================================
'use strict';
const { api } = require('./_bootstrap');
const parser = global.window.MATM0_PARSER;

parser.setTodayForTests(new Date(2026, 6, 1, 0, 0, 0, 0));
parser.setNowForTests(new Date(2026, 6, 1, 14, 35, 0, 0));

function evalKind(expr) {
  try { return (api.evalCalcExpression(expr) || {}).kind; } catch (e) { return 'ERR'; }
}
function evalText(expr) {
  try { return (api.evalCalcExpression(expr) || {}).text; } catch (e) { return null; }
}
function evalVal(expr) {
  try {
    const r = api.evalCalcExpression(expr);
    return r && typeof r.value === 'number' ? r.value : null;
  } catch (e) { return null; }
}

// { pl, en, kind?, sameText?, sameValue?, textRe? }
const PAIRS = [
  { pl: 'teraz', en: 'now', kind: 'date', textRe: /^1\.7\.26 14:35 \(środa\)$/ },
  { pl: 'dziś', en: 'today', kind: 'date' },
  { pl: 'dziś + 90 dni', en: 'today + 90 days', kind: 'date' },
  { pl: 'teraz - 2 dni', en: 'now - 2 days', kind: 'date' },
  { pl: 'za 3 tygodnie', en: 'in 3 weeks', kind: 'date' },
  { pl: '3 dni temu', en: '3 days ago', kind: 'date' },
  { pl: 'jutro', en: 'tomorrow', kind: 'date' },
  { pl: 'wczoraj', en: 'yesterday', kind: 'date' },
  { pl: 'ile dni od 1.01.2026 do 1.02.2026', en: 'how many days from 1.01.2026 to 1.02.2026', kind: 'date', sameValue: true },
  { pl: 'od 9:30 do 17:15', en: 'from 9:30 to 17:15', kind: 'duration' },
  { pl: '20% z 150', en: '20% of 150', sameValue: true },
  { pl: 'ile % stanowi 25 z 200', en: 'what percent is 25 of 200', kind: 'percent', sameValue: true },
  { pl: '25 z 200 stanowi ile %', en: '25 of 200 is what percent', kind: 'percent', sameValue: true },
  { pl: '20% z 150', en: '150 z 20%', sameValue: true },
  { pl: '15% napiwek na 42', en: 'napiwek 15% na 42', sameValue: true },
  { pl: 'dziś + 90 dni', en: '90 dni + dziś', sameText: true },
  { pl: 'od 9:30 do 17:15', en: '9:30 to 17:15', kind: 'duration' },
  { pl: '120cm na mm', en: '120cm to mm', sameValue: true },
  { pl: '90 min na h', en: '90 min to h', sameValue: true },
  { pl: 'połowa 300', en: 'half of 300', sameValue: true },
  { pl: 'proporcja 3 do 5', en: 'ratio of 3 to 5', sameValue: true },
  { pl: 'pierwiastek z 144', en: 'square root of 144', sameValue: true },
  { pl: '8,5% to 20, ile 100%', en: '20 is 8.5% of what', sameValue: true },
  { pl: '8,5% to 20, ile 50%', en: 'what is 50% if 8.5% is 20', sameValue: true },
  { pl: '8,5%=20;50%', en: '8.5%=20;50%', sameValue: true },
  { pl: '8,5%=20', en: '8.5%=20', sameValue: true },
  { pl: '20 to 8,5% z czego', en: '20 is 8.5% of what', sameValue: true },
  { pl: '8,5% to 80pln', en: '80 pln is 8.5% of what', sameValue: true },
  { pl: '20pln to 8,5%', en: '20 pln is 8.5%', sameValue: true },
  { pl: '80pln=8,5%', en: '8.5%=80pln', sameValue: true },
  { pl: 'brutto 1000', en: 'gross 1000', sameValue: true },
  { pl: 'vat od 1000', en: 'tax on 1000', sameValue: true },
  { pl: 'sin(30 deg)', en: 'sin(30 deg)', sameValue: true },
  { pl: 'różnica % między 30 a 90', en: 'percent difference between 30 and 90', kind: 'percent', sameValue: true },
  { pl: 'poniedziałek za 3 tygodnie', en: 'monday in 3 weeks', kind: 'date' },
  { pl: '145 min', en: '145 min', kind: 'duration' },
];

let pass = 0, fail = 0;
PAIRS.forEach(function (p) {
  const kPl = evalKind(p.pl), kEn = evalKind(p.en);
  let ok = true, why = [];
  if (p.kind && (kPl !== p.kind || kEn !== p.kind)) {
    ok = false; why.push('kind pl=' + kPl + ' en=' + kEn + ' want=' + p.kind);
  }
  if (p.sameValue) {
    const vPl = evalVal(p.pl), vEn = evalVal(p.en);
    if (vPl === null || vEn === null || Math.abs(vPl - vEn) > 1e-9) {
      ok = false; why.push('value pl=' + vPl + ' en=' + vEn);
    }
  }
  if (p.sameText) {
    const tPl = evalText(p.pl), tEn = evalText(p.en);
    if (tPl !== tEn) { ok = false; why.push('text pl=' + tPl + ' en=' + tEn); }
  }
  if (p.textRe) {
    if (!p.textRe.test(evalText(p.pl)) || !p.textRe.test(evalText(p.en))) {
      ok = false; why.push('textRe fail');
    }
  }
  if (ok) pass++; else { fail++; console.log('  ✗', p.pl, '|', why.join('; ')); }
});

parser.clearTodayForTests();
parser.clearNowForTests();

console.log('  ' + (fail ? '✗' : '✓') + ' help-bilingual: ' + pass + '/' + (pass + fail) + ' PASS');
process.exit(fail ? 1 : 0);
