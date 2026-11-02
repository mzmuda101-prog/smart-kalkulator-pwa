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
ok('Δ w krokach', labels('rozwiąż x^2-5x+6=0').includes('wyróżnik'));
ok('nawiasy w krokach', labels('rozwiąż 3(x-2)=x+4').includes('Opuszczam nawiasy'));
ok('sprawdzenie w krokach', labels('rozwiąż 2x+3=7').includes('Sprawdzenie'));
ok('wspólny mianownik', labels('kroki 1/2+1/3').includes('mianownika 6'));
ok('kolejność działań', labels('kroki 2+3*4').startsWith('Działanie | Mnożenie | Dodawanie'));
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
