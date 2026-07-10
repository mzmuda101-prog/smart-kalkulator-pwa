// ============================================================
//  Regresja: MATM0_PL_FOLD — komendy PL bez polskich znaków (mobile).
// ============================================================
const { api } = require('./_bootstrap.js');

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps != null ? eps : 1e-6);
}

const cases = [
  { expr: 'roznica % miedzy 8 a 5', unit: '%', value: -37.5 },
  { expr: 'z 8 na 5 to ile %', unit: '%', value: -37.5 },
  { expr: '20% znizki na 150', value: 120 },
  { expr: 'polowa 100', value: 50 },
  { expr: 'dodaj 10% do 200', value: 220 },
  { expr: 'ile % stanowi 25 z 200', unit: '%', value: 12.5 },
  { expr: 'różnica % między 8 a 5', unit: '%', value: -37.5 }, // z diakrytykami — nadal OK
];

let pass = 0;
cases.forEach(function (c) {
  const r = api.evalCalcExpression(c.expr);
  ok(r && r.value != null, c.expr + ' → brak wyniku');
  if (c.unit) ok(r.unit === c.unit, c.expr + ' unit: ' + r.unit);
  ok(near(r.value, c.value), c.expr + ' → ' + r.value + ' (chcę ' + c.value + ')');
  pass++;
});

console.log('  ✓ pl-fold-regression: ' + pass + '/' + pass + ' PASS');
console.log('\n=== pl-fold-regression: OK ===');
