// Dymki w krokach (spec 2026-11-23-dymki-design.md): który krok ma dymek i jakie liczby z zadania pokazuje.
// Uruchom: node test/step-popovers.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { stepToLatex } = require(path.join(root, 'js', 'expr-to-latex.js'));
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
/** kroki wszystkich sposobów, które wskazują hasło `id` */
function stepsWith(q, id) {
    const r = S.run(q);
    if (!r || !r.explain) return [];
    return (r.explain.methods || [r.explain]).flatMap(m => m.steps).filter(s => s.formula && s.formula.id === id);
}
// ta sama reguła co w test/expr-to-latex.js: bez zapisu z klawiatury
const leaks = (/** @type {string} */ t) => {
    const tex = stepToLatex(t).join(' ');
    return (tex.match(/\\text\{[^}]*\}/g) || []).some(w => /[/^²³]|\\\^|√\(|sqrt/.test(w)) || /sqrt\(|\^\(|√\(/.test(tex);
};

// [zapytanie, hasło, oczekiwane „here” (undefined = bez linijki)]
/** @type {Array<[string, string, string | undefined]>} */
const COVER = [
    ['rozwiąż x^2 - 5x + 6 = 0', 'delta', 'a = 1, b = −5, c = 6'],
    ['rozwiąż x^2 - 5x + 6 = 0', 'wzory-x12', 'a = 1, b = −5, Δ = 1'],
    ['rozwiąż -x^2 + 7x - 6 = 0', 'delta', 'a = −1, b = 7, c = −6'],
    ['rozwiąż x^2 - 4x + 4 = 0', 'wzor-x0', 'a = 1, b = −4, c = 4'],
    ['wierzchołek 2x^2 + 3x - 2', 'wierzcholek', 'a = 2, b = 3'],
    ['pochodna x^2*e^x', 'pochodna-iloczynu', 'u = x², v = e^x'],
    ['pochodna x/(x+1)', 'pochodna-ilorazu', 'u = x, v = x + 1'],
    ['całka x*sin(x)', 'przez-czesci', 'u = x, dv = sin(x) dx'],
    // Task 4: nierówności, wartość bezwzględna, trygonometria, wykładnicze
    ['rozwiąż x^2 - 4 < 0', 'nierownosc-kwadratowa', 'x₁ = −2, x₂ = 2, a = 1'],
    ['rozwiąż 5 - 2x ≥ 11', 'odwracanie-znaku', undefined],
    ['rozwiąż |x-2| < 3', 'wartosc-bezwzgledna', 'a = 2, r = 3'],
    ['rozwiąż |x-2| = 3', 'wartosc-bezwzgledna', 'a = 2, r = 3'],
    ['rozwiąż sin(x) = 1/2', 'wartosci-trygonometryczne', undefined],
    ['rozwiąż sin(x) = 1/2', 'okresowosc', undefined],
    ['rozwiąż tg(x) = 1', 'okresowosc', undefined],
    ['rozwiąż 4^x = 2^(x+3)', 'rownosc-poteg', 'a = 2'],
    ['rozwiąż 2^x = 5', 'definicja-logarytmu', 'a = 2, b = 5'],
    // Task 5: układy, wymierne, pierwiastek, NWD/NWW, procenty, ułamki
    ['rozwiąż 2x + y = 7, x - y = 2', 'uklad-podstawianie', undefined],
    ['rozwiąż 2x + y = 7, x - y = 2', 'uklad-przeciwne', undefined],
    ['rozwiąż (x+1)/(x-2) = 3', 'rownanie-wymierne', undefined],
    ['rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'rownanie-wymierne', undefined],
    ['rozwiąż √(x+3) = x - 3', 'rownanie-z-pierwiastkiem', undefined],
    ['nwd(12, 18)', 'nwd-nww', undefined],
    ['nww(4, 6)', 'nwd-nww', undefined],
    ['kroki 20% z 150', 'procent-z-liczby', 'p = 20, B = 150'],
    ['kroki 150 + 20%', 'zmiana-o-procent', 'p = 20, B = 150'],
    ['kroki ile procent 30 z 120', 'procent-z-liczby', undefined],
    ['kroki 3/4 - 1/6', 'wspolny-mianownik', undefined],
    ['kroki 2/3 * 9/4', 'mnozenie-ulamkow', undefined],
    ['kroki 3/5 : 9/10', 'dzielenie-ulamkow', undefined],
];

for (const [q, id, here] of COVER) {
    ok(id + ': wpis w słowniku', !!FORMULAS[id], id);
    const st = stepsWith(q, id);
    ok(q + ' → dymek ' + id, st.length > 0, st.length);
    if (!st.length) continue;
    ok(q + ' → ' + id + ': kolor w kroku', st.every(s => /⟦/.test(s.math)), st.map(s => s.math));
    const got = st[0].formula.here;
    ok(q + ' → ' + id + ': liczby z zadania', got === here, got);
    if (got) ok(q + ' → ' + id + ': liczby narysowane bez zapisu z klawiatury', !leaks(got), stepToLatex(got));
}

// pokrycie (spec, cel 1): każdy typ zadania z tabeli ma co najmniej jeden dymek w każdym sposobie
for (const q of [...new Set(COVER.map(c => c[0]))]) {
    const r = S.run(q);
    for (const m of (r.explain.methods || [r.explain])) ok(q + (m.label ? ' [' + m.label + ']' : '') + ': co najmniej jeden dymek', m.steps.some(s => s.formula), m.steps.map(s => s.label));
}

console.log(`step-popovers: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
