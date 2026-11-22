// Rozwiązania krok po kroku (js/math-steps.js): przykłady + losowe zadania.
// Uruchom: node test/math-steps.js
'use strict';
const path = require('path');
const fc = require('fast-check');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
function text(q) { const r = S.run(q); return r && r.text; }
function labels(q) { return S.run(q).explain.steps.map(s => s.label).join(' | '); }

// równania
[
    ['rozwiąż 2x + 3 = 7', 'x = 2'],
    ['rozwiaz 3(x-2)=x+4', 'x = 5'],
    ['solve x^2-5x+6=0', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż x²=9', 'x₁ = −3, x₂ = 3'],
    ['rozwiąż 2x^2-8=0', 'x₁ = −2, x₂ = 2'],
    ['rozwiąż x^2-4x=0', 'x₁ = 0, x₂ = 4'],
    ['rozwiąż x^2-2x+1=0', 'x = 1'],
    ['rozwiąż x^2+x-1=0', 'x₁ = (−1 − √5)/2, x₂ = (−1 + √5)/2'],
    ['rozwiąż x^2+1=0', 'Brak rozwiązań rzeczywistych'],
    ['rozwiąż x^2+x+1=0', 'Brak rozwiązań rzeczywistych'],
    ['rozwiąż x^3-6x^2+11x-6=0', 'x₁ = 1, x₂ = 2, x₃ = 3'],
    ['rozwiąż 0,5x+1,2=3', 'x = 3,6'],
    ['rozwiąż x/2+1=3', 'x = 4'],
    ['rozwiąż 2x+3y=7', 'x = −(3/2)y + 7/2'],
    ['rozwiąż x=x', 'Każda liczba spełnia'],
    ['rozwiąż x+1=x', 'Brak rozwiązań'],
    ['rozwiąż x^2-5x+6', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż 2t-4=0', 't = 2'],
].forEach(([q, want]) => ok(q, text(q) === want, text(q)));

// uczciwość: czego nie umiemy, tego nie zgadujemy
['rozwiąż 1/x=2', 'rozwiąż sqrt(x)=3', 'rozwiąż 2^x=8', 'rozwiąż x^5+x+1000003=0', 'rozwiąż x^99=1']
    .forEach(q => ok('nie zgaduje: ' + q, text(q) === 'Jeszcze tego nie rozwiążę' && !S.run(q).explain, S.run(q)));
['rozwiąż 2x +', 'rozwiąż (x', 'rozwiąż x==2', 'kroki 2+', 'rozwiąż']
    .forEach(q => ok('niedopisane: ' + q, S.run(q) === null, S.run(q)));
['2+2', '100 zł + 23% vat', 'dziś + 90 dni', 'x', 'rozwijanie']
    .forEach(q => ok('nie przejmuje: ' + q, S.run(q) === null, S.run(q)));

// gołe równania
ok('gołe równanie', S.runBare('2x + 3 = 7').text === 'x = 2');
['x = 5', 'cena = 5', 'km = 5', '2x3=6', 'a = b = 3', '2 + 3 = 5', '1/x=2']
    .forEach(q => ok('gołe odrzuca: ' + q, S.runBare(q) === null, S.runBare(q)));

// upraszczanie, rozkład, rachunki
[
    ['uprość (x+1)^2+2x', 'x² + 4x + 1'],
    ['rozwiń (x+1)(x+2)', 'x² + 3x + 2'],
    ['simplify 3x+2y-x', '2x + 2y'],
    ['uprość 2x-2x', '0'],
    ['rozłóż x^2-5x+6', '(x − 2)(x − 3)'],
    ['rozłóż x^2-4', '(x − 2)(x + 2)'],
    ['rozłóż 2x^2+4x', '2x(x + 2)'],
    ['rozłóż 2x^2-8', '2(x − 2)(x + 2)'],
    ['factor x^3-1', '(x − 1)(x² + x + 1)'],
    ['rozłóż x^2+x+1', 'x² + x + 1'],
    ['rozłóż x^2+2x+1', '(x + 1)²'],
    ['kroki 1/2+1/3', '5/6'],
    ['kroki 2*(3+4)^2', '98'],
    ['kroki 2+3*4', '14'],
    ['kroki 0,1+0,2', '0,3'],
    ['1/3*0,25 krok po kroku', '1/12'],
    ['kroki sqrt(16)+1', '5'],
].forEach(([q, want]) => ok(q, text(q) === want, text(q)));

// pierwiastki liczbowe: wyciąganie kwadratów i usuwanie niewymierności z mianownika
[
    ['uprość √8', '2√2', 2 * Math.SQRT2],
    ['uprość sqrt(8)', '2√2', 2 * Math.SQRT2],
    ['uprość sqrt(12) + sqrt(27)', '5√3', 5 * Math.sqrt(3)],
    ['uprość 1/√2', '√2/2', Math.SQRT1_2],
    ['uprość 1/(√3 - 1)', '(√3 + 1)/2', 1 / (Math.sqrt(3) - 1)],
    ['uprość √(4·18)', '6√2', 6 * Math.SQRT2],
    ['uprość √7', '√7', Math.sqrt(7)],
    ['uprość 2√3 - √12', '0', 0],
    ['kroki 0,5√8', '√2', Math.SQRT2],
].forEach(([q, want, v]) => {
    const r = S.run(q);
    ok(q, r.text === want && Math.abs(r.value - v) < 1e-9 && r.explain.steps.slice(-1)[0].final, r);
});
ok('sprzężenie w krokach', labels('uprość 1/(√3 - 1)').includes('Usuwamy niewymierność z mianownika'));
ok('wymierny pierwiastek po staremu', labels('kroki sqrt(16)+1') === 'Działanie | Liczę pierwiastek | Dodaję', labels('kroki sqrt(16)+1'));

// przykłady ze ściągi dają obiecany wynik
[
    ['rozwiąż 3(x - 2) = x + 4', 'x = 5'],
    ['rozwiąż x^2 - 5x + 6 = 0', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż x^3 - 6x^2 + 11x - 6 = 0', 'x₁ = 1, x₂ = 2, x₃ = 3'],
    ['uprość (x + 1)^2 + 2x', 'x² + 4x + 1'],
    ['rozłóż x^2 - 5x + 6', '(x − 2)(x − 3)'],
    ['kroki 1/2 + 1/3', '5/6'],
    ['2 * (3 + 4)^2 krok po kroku', '98'],
].forEach(([q, want]) => ok('ściąga: ' + q, text(q) === want, text(q)));

// długi dokładny wynik: na ekranik przybliżenie, pełna postać w krokach
const longRes = S.run('rozwiąż 12345x^2 - 98765x + 4321 = 0');
ok('długi wynik skrócony', longRes.text.includes('≈') && longRes.text.length < 40, longRes.text);
ok('dokładna postać w krokach', longRes.explain.steps.slice(-1)[0].math.includes('√'));

// treść kroków
ok('Δ w krokach', labels('rozwiąż x^2-5x+6=0').includes('Liczę deltę'));
ok('nawiasy w krokach', labels('rozwiąż 3(x-2)=x+4').includes('Opuszczam nawiasy'));
ok('sprawdzenie w krokach', labels('rozwiąż 2x+3=7').includes('Sprawdzenie'));
ok('wspólny mianownik', labels('kroki 1/2+1/3').includes('mianownika 6'));
ok('kolejność działań', labels('kroki 2+3*4').startsWith('Działanie | Mnożę | Dodaję'), labels('kroki 2+3*4'));
// ── 3e-1: równania i ułamki zrozumiałe (plan kroków) ──
const st = q => S.run(q).explain.steps;
const has = (q, label, math) => st(q).some(x => x.label === label && (math == null || x.math === math));
const fm = (q, id) => st(q).some(x => x.formula && x.formula.id === id && /⟦.+⟧/.test(x.math));
// przeniesienie widać osobno, potem redukcja
ok('3e: przeniesienie 3x − x = 4 + 6', has('rozwiąż 3(x - 2) = x + 4', 'Przenoszę x na lewo, liczby na prawo', '3x − x = 4 + 6'), st('rozwiąż 3(x - 2) = x + 4'));
ok('3e: redukcja 2x = 10', has('rozwiąż 3(x - 2) = x + 4', 'Redukuję wyrazy podobne', '2x = 10'));
ok('3e: tylko liczby na prawo: 2x = 11 − 3', has('rozwiąż 2x + 3 = 11', 'Przenoszę liczby na prawo', '2x = 11 − 3'), st('rozwiąż 2x + 3 = 11'));
// sprawdzenie z podstawieniem
ok('3e: sprawdzenie z podstawieniem', has('rozwiąż 3(x - 2) = x + 4', 'Sprawdzenie', 'x = 5:  L = 3(5 − 2) = 9,  P = 5 + 4 = 9 ✓'), st('rozwiąż 3(x - 2) = x + 4').slice(-2));
ok('3e: sprawdzenie bez sklejania 5 · 2', st('rozwiąż x^2 - 5x + 6 = 0').some(x => x.label === 'Sprawdzenie' && x.math.includes('L = 2² − 5 · 2 + 6 = 0')), st('rozwiąż x^2 - 5x + 6 = 0').slice(-2));
ok('3e: sprawdzenie liczby ujemnej w nawiasie', st('rozwiąż x^2 = 9').some(x => x.math.includes('L = (−3)² = 9')), st('rozwiąż x^2 = 9'));
// Δ i wzory na x w dymkach, etykiety bez wzorów
const q2 = 'rozwiąż x^2 - 5x + 6 = 0';
ok('3e: Liczę deltę z podkreśleniem', has(q2, 'Liczę deltę') && fm(q2, 'delta'), st(q2));
ok('3e: Liczę dwa rozwiązania, 2 · 1 w mianowniku', has(q2, 'Liczę dwa rozwiązania') && fm(q2, 'wzory-x12') && st(q2).some(x => x.math.includes('/ (2 · 1)')), st(q2));
ok('3e: jedno rozwiązanie', has('rozwiąż x^2 - 4x + 4 = 0', 'Liczę jedno rozwiązanie') && fm('rozwiąż x^2 - 4x + 4 = 0', 'wzor-x0'), st('rozwiąż x^2 - 4x + 4 = 0'));
ok('3e: sprawdzenie 6x² → 6 · 1²', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.math.includes('L = 1³ − 6 · 1² + 11 · 1 − 6 = 0')), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').slice(-2));
// rozkład: miejsca zerowe, potem postać iloczynowa
ok('3e: rozkład przez miejsca zerowe', has('rozłóż x^2 - 5x + 6', 'Szukam miejsc zerowych') && fm('rozłóż x^2 - 5x + 6', 'postac-iloczynowa'), st('rozłóż x^2 - 5x + 6'));
// kwadrat sumy
ok('3e: kwadrat sumy', has('uprość (x + 1)^2 + 2x', 'Rozpisuję kwadrat sumy') && fm('uprość (x + 1)^2 + 2x', 'kwadrat-sumy'), st('uprość (x + 1)^2 + 2x'));
// ułamki: rozszerzanie widać, czasowniki
ok('3e: rozszerzanie ułamków', has('kroki 1/2 + 1/3', 'Sprowadzam do wspólnego mianownika 6', '(1 · 3)/(2 · 3) + (1 · 2)/(3 · 2) = 3/6 + 2/6'), st('kroki 1/2 + 1/3'));
ok('3e: Dodaję liczniki', has('kroki 1/2 + 1/3', 'Dodaję liczniki'), st('kroki 1/2 + 1/3'));
// wielomian: krótka etykieta, W(r) = 0
ok('3e: wielomian W(1) = 0', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.label === 'Szukam pierwiastka wśród dzielników' && /W\(1\) = .* = 0/.test(x.math)), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0'));
// uwagi „słabego ucznia” (3e-1)
ok('3e: 4/6 + 5/6 → 9/6 → skracam do 3/2', has('kroki 2/3 + 5/6', 'Dodaję liczniki', '9/6') && has('kroki 2/3 + 5/6', 'Skracam ułamek', '9/6 = 3/2'), st('kroki 2/3 + 5/6'));
ok('3e: bez (5 · 1)/(6 · 1)', !st('kroki 2/3 + 5/6').some(x => x.math.includes('· 1)')), st('kroki 2/3 + 5/6'));
ok('3e: rozwiązania z pierwiastkiem — podstawienie podkreślone', st('rozwiąż x^2 - 2x - 1 = 0').some(x => x.math.includes('x₁ = ⟦(2 − 2√2) / (2 · 1)⟧ = 1 − √2')), st('rozwiąż x^2 - 2x - 1 = 0'));
ok('3e: kwadrat sumy podkreślony bez + 2x', has('uprość (x + 1)^2 + 2x', 'Rozpisuję kwadrat sumy', '⟦x² + x + x + 1⟧ + 2x'), st('uprość (x + 1)^2 + 2x'));
ok('3e: x² + 1 = 0 — przeniesienie nazwane', has('rozwiąż x^2 + 1 = 0', 'Przenoszę liczbę na prawo', 'x² = −1'), st('rozwiąż x^2 + 1 = 0'));
ok('3e: W(x) zdefiniowane i W(1) policzone', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.math.startsWith('W(x) = x³ − 6x² + 11x − 6,  W(1) = 1 − 6 + 11 − 6 = 0')), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0'));
// żadna etykieta równań/ułamków nie zawiera wzoru
const eqLabels = ['rozwiąż 3(x - 2) = x + 4', q2, 'rozwiąż x^2 - 4x + 4 = 0', 'rozwiąż x^2 - 2x - 1 = 0', 'rozwiąż x^3 - 6x^2 + 11x - 6 = 0', 'rozłóż x^2 - 9', 'rozłóż x^2 - 5x + 6']
    .flatMap(q => st(q).map(x => x.label)).filter(l => /[=∓]|\(x − /.test(l));
ok('3e: etykiety bez wzorów', eqLabels.length === 0, [...new Set(eqLabels)]);

const last = S.run('rozwiąż 2x+3=7').explain.steps.slice(-1)[0];
ok('ostatni krok oznaczony', last.final === true);

// losowo: wynik zawsze spełnia równanie
const int = fc.integer({ min: -30, max: 30 });
fc.assert(fc.property(int, int, int, int, (a, b, c, d) => {
    fc.pre(a !== c);
    const r = S.run(`rozwiąż ${a}x + (${b}) = ${c}x + (${d})`);
    return r.value !== null && Math.abs((a - c) * r.value + b - d) < 1e-9;
}), { numRuns: 400 });
fc.assert(fc.property(int, int, int, (r1, r2, k) => {
    fc.pre(k !== 0);
    const b = -k * (r1 + r2), c = k * r1 * r2;
    const res = S.run(`rozwiąż ${k}x^2 + (${b})x + (${c}) = 0`);
    const want = r1 === r2 ? `x = ${r1}` : null;
    if (want) return res.text.replace('−', '-') === want;
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return res.text.replace(/−/g, '-') === `x₁ = ${lo}, x₂ = ${hi}`;
}), { numRuns: 400 });
fc.assert(fc.property(int, int, int, (a, b, c) => {
    fc.pre(a !== 0);
    const res = S.run(`rozwiąż ${a}x^2 + (${b})x + (${c}) = 0`);
    const delta = b * b - 4 * a * c;
    if (delta < 0) return res.text === 'Brak rozwiązań rzeczywistych';
    return res.explain !== null && res.text.startsWith('x');
}), { numRuns: 400 });
pass += 3;

console.log(`math-steps: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
