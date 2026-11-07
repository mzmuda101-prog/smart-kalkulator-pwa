// ============================================================
//  Regresja PL/EN_UNIT_GRAMMAR — odmiana + aliasy wejściowe
//  Uruchom: node test/pl-unit-grammar.js
// ============================================================
'use strict';
const { api } = require('./_bootstrap');
const DATA = global.window.MATM0_DATA;

let pass = 0, fail = 0;
const fails = [];

function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  fails.push(msg);
}

function inflect(v, label) {
  return DATA.inflectUnit(v, label);
}

// ── PL: odmiana wyświetlania ──────────────────────────────────
[
  [1, 'stopa', 'stopa'],
  [2, 'stopa', 'stopy'],
  [5, 'stopa', 'stóp'],
  [22, 'stopa', 'stopy'],
  [11, 'stopa', 'stóp'],
  [1, 'funt', 'funt'],
  [3, 'funt', 'funty'],
  [5, 'funt', 'funtów'],
  [1, 'litr', 'litr'],
  [2, 'litr', 'litry'],
  [5, 'litr', 'litrów'],
  [1, 'stopień', 'stopień'],
  [5, 'stopni', 'stopni'],
].forEach(function (row) {
  var got = inflect(row[0], row[1]);
  ok(got === row[2], 'PL ' + row[0] + ' ' + row[1] + ' → ' + row[2] + ' (got ' + got + ')');
});

// ── EN: odmiana wyświetlania (tryb domyślny „Jak wpisano”) ─────
// Symbol zostaje symbolem (K10: „4,41 lb”, nie „pounds”); słowo odmieniane po angielsku.
[
  [1, 'ft', 'ft'],
  [5, 'ft', 'ft'],
  [1, 'foot', 'foot'],
  [5, 'foot', 'feet'],
  [1, 'lb', 'lb'],
  [5, 'lbs', 'lbs'],
  [1, 'inch', 'inch'],
  [3, 'inches', 'inches'],
  [5, 'yard', 'yards'],
].forEach(function (row) {
  var got = inflect(row[0], row[1]);
  ok(got === row[2], 'EN ' + row[0] + ' ' + row[1] + ' → ' + row[2] + ' (got ' + got + ')');
});

// ── PL: ułamek → dopełniacz lp. (1,5 godziny · 4,41 funta · 2,5 roku) ──
[
  [4.41, 'funty', 'funta'],
  [6.2, 'mile', 'mili'],
  [1.5, 'godzina', 'godziny'],
  [2.5, 'rok', 'roku'],
  [0.5, 'litr', 'litra'],
  [2.0000000001, 'funt', 'funty'], // ułamek poniżej precyzji wyświetlania = liczba całkowita
].forEach(function (row) {
  var got = inflect(row[0], row[1]);
  ok(got === row[2], 'PL ułamek ' + row[0] + ' ' + row[1] + ' → ' + row[2] + ' (got ' + got + ')');
});

// ── Tryby ⚙️ „Jednostki w wyniku”: typed / short / long ─────────
[
  // [wartość, etykieta, typed, short, long]
  [5, 'lb', 'lb', 'lb', 'funtów'],
  [4.41, 'lb', 'lb', 'lb', 'funta'],
  [5, 'funt', 'funtów', 'lb', 'funtów'],
  [5, 'foot', 'feet', 'ft', 'stóp'],
  [1, 'ft', 'ft', 'ft', 'stopa'],
  [5, 'yd', 'yd', 'yd', 'jardów'],
  [3, 'godzin', 'godziny', 'h', 'godziny'],
  [3, 'h', 'h', 'h', 'h'],           // metryczne symbole nie są rozwijane
  [6.2, 'mile', 'mili', 'mili', 'mili'], // mila nie ma skrótu („mi” to polskie słowo)
  [5, 'kg', 'kg', 'kg', 'kg'],
].forEach(function (row) {
  ['typed', 'short', 'long'].forEach(function (mode, i) {
    var got = DATA.inflectUnit(row[0], row[1], mode);
    ok(got === row[2 + i], mode + ' ' + row[0] + ' ' + row[1] + ' → ' + row[2 + i] + ' (got ' + got + ')');
  });
});

// Tryb globalny (ustawiany z ⚙️ i w workerze notatnika) działa bez trzeciego argumentu.
DATA.setUnitNameMode('long');
ok(inflect(5, 'lb') === 'funtów', 'setUnitNameMode(long): 5 lb → funtów (got ' + inflect(5, 'lb') + ')');
DATA.setUnitNameMode('bzdura');
ok(DATA.getUnitNameMode() === 'typed', 'nieznany tryb → typed');

// Nowe formy ułamkowe parser czyta z powrotem (wynik po „=” wraca do pola).
var backFrac = api.evalCalcExpression('4,41 funta na kg');
ok(backFrac && backFrac.unit === 'kg' && Math.abs(backFrac.value - 2.000351) < 1e-3,
  '4,41 funta na kg ≈ 2 kg (got ' + (backFrac && backFrac.value) + ' ' + (backFrac && backFrac.unit) + ')');

// Symbole SI — bez zmian
ok(inflect(5, 'kg') === 'kg', 'kg bez odmiany');
ok(inflect(5, 'km') === 'km', 'km bez odmiany');

// ── Alias wejściowy stóp ───────────────────────────────────────
var units = (DATA.UNIT_CATEGORIES || {}).length || {};
ok(units.stóp === units.stopa, 'stóp → ten sam współczynnik co stopa');

var conv = api.evalCalcExpression('5 stóp na m');
ok(conv && conv.unit === 'm' && Math.abs(conv.value - 1.524) < 1e-6,
  '5 stóp na m = 1,524 m (got ' + (conv && conv.value) + ' ' + (conv && conv.unit) + ')');

// Jednostka robocza + odmiana w wyniku (bez autodoboru na bazę)
api.state.settings.defaultUnits.length = '';
api.state.settings.defaultUnits.mass = '';
var fiveFeet = api.evalCalcExpression('5 stopa');
ok(fiveFeet && fiveFeet.unit === 'stóp' && fiveFeet.value === 5,
  '5 stopa → 5 stóp (got ' + (fiveFeet && fiveFeet.value) + ' ' + (fiveFeet && fiveFeet.unit) + ')');
var fiveLb = api.evalCalcExpression('5 funt');
ok(fiveLb && fiveLb.unit === 'funtów' && fiveLb.value === 5,
  '5 funt → 5 funtów (got ' + (fiveLb && fiveLb.value) + ' ' + (fiveLb && fiveLb.unit) + ')');
api.state.settings.defaultUnits.length = '';
var fiveFt = api.evalCalcExpression('5 foot');
ok(fiveFt && fiveFt.unit === 'feet' && fiveFt.value === 5,
  '5 foot → 5 feet (got ' + (fiveFt && fiveFt.value) + ' ' + (fiveFt && fiveFt.unit) + ')');

console.log('  ' + (fail ? '✗' : '✓') + ' pl-unit-grammar: ' + pass + '/' + (pass + fail) + ' PASS');
if (fails.length) fails.forEach(function (f) { console.log('  ✗', f); });
console.log('\n=== pl-unit-grammar: ' + (fail ? 'FAIL' : 'OK') + ' ===');
process.exit(fail ? 1 : 0);
