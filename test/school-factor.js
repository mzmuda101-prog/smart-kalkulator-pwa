// @ts-check
// Rozkład jak w szkole (js/math-steps.js, schoolFactor): kolejność prób, rekurencja, iloczyn czynników = wejście.
// Uruchom: node test/school-factor.js
'use strict';
const path = require('path');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));
const C = /** @type {any} */ (S)._core;

let pass = 0, fail = 0;
/** @param {string} name @param {boolean} cond @param {unknown} [got] */
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got, (_k, x) => typeof x === 'bigint' ? String(x) : x));
}
/** @param {any[]} a @param {any[]} b */
function pmul(a, b) {
    const out = Array.from({ length: a.length + b.length - 1 }, () => C.ZERO);
    a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = C.add(out[i + j], C.mul(x, y)); }));
    return out;
}
/** @param {any[]} a @param {any[]} b */
const same = (a, b) => a.length === b.length && a.every((x, i) => C.eq(x, b[i]));

/** @param {string} src @param {string[]} want @param {(r: any) => void} [more] */
function check(src, want, more) {
    const p = C.polyCoefs(src);
    const r = C.schoolFactor(p.c, p.v, { dec: false });
    if (!r) { ok(src + ': rozkłada się', false, r); return; }
    ok(src + ': used ⊇ ' + want.join(', '), want.every(w => r.used.includes(w)), r.used);
    let prod = [r.lead];
    for (const f of r.factors) for (let i = 0; i < f.n; i++) prod = pmul(prod, f.c);
    ok(src + ': iloczyn czynników = wejście', same(prod, p.c), r.factors);
    const all = r.steps.map((/** @type {any} */ s) => s.label + ' ' + s.math).join('\n');
    ok(src + ': Horner tylko gdy użyty', r.used.includes('horner') || !/Horner/.test(all), all);
    ok(src + ': każdy krok ma dymek albo jest złożeniem', r.steps.every((/** @type {any} */ s) => s.formula || /^(Składam całość|Wciągam liczbę do nawiasu|Szukam pierwiastka|Odczytuję|Liczę)/.test(s.label)), r.steps.map((/** @type {any} */ s) => s.label));
    if (more) more(r);
}

check('x^3-x', ['wspolny', 'roznica-kwadratow']);
check('4x^2-9', ['roznica-kwadratow'], r => ok('4x²−9: (2x)² − 3²', r.steps.some((/** @type {any} */ s) => s.math.includes('(2x)² − 3²')), r.steps));
check('x^2-6x+9', ['kwadrat-roznicy'], r => ok('x²−6x+9: jeden czynnik podwójny', r.factors.length === 1 && r.factors[0].n === 2, r.factors));
check('x^3-8', ['roznica-szescianow']);
check('x^3+8', ['suma-szescianow']);
check('x^2-5x+6', ['viete'], r => ok('Viète bez delty', !r.used.includes('delta'), r.used));
check('2x^2-3x+1', ['delta']);
check('x^3-2x^2+x-2', ['grupowanie'], r => {
    ok('grupowanie: x²(x − 2) + (x − 2)', r.steps.some((/** @type {any} */ s) => s.math.includes('x²(x − 2) + (x − 2)')), r.steps);
    ok('grupowanie: (x − 2)(x² + 1)', r.steps.some((/** @type {any} */ s) => s.math.includes('(x − 2)(x² + 1)')), r.steps);
});
check('x^4-13x^2+36', ['podstawienie-t', 'roznica-kwadratow'], r => {
    ok('t = x²: 4 czynniki liniowe', r.factors.length === 4 && r.factors.every((/** @type {any} */ f) => f.c.length === 2 && f.n === 1), r.factors);
    ok('t = x²: zapisane podstawienie', r.steps.some((/** @type {any} */ s) => s.math.startsWith('t = x²')), r.steps);
});
check('x^3-6x^2+11x-6', ['horner']);
check('x^4-2x^2+1', ['podstawienie-t'], r => ok('(x²−1)²: krotność 2', r.factors.length === 2 && r.factors.every((/** @type {any} */ f) => f.n === 2), r.factors));
check('x^6-1', ['roznica-kwadratow', 'roznica-szescianow', 'suma-szescianow']);
{
    const p = C.polyCoefs('x^2+x+1');
    const r = C.schoolFactor(p.c, p.v, { dec: false });
    ok('x²+x+1: nie rozkłada się', r === null || (r.factors.length === 1 && r.factors[0].c.length === 3), r);
}
ok('stopień < 2: null', C.schoolFactor(C.polyCoefs('2x+4').c, 'x', { dec: false }) === null);

// rozłóż: kroki szkolne, wynik bez zmian
const st = (/** @type {string} */ q) => S.run(q).explain.steps;
const txt = (/** @type {string} */ q) => S.run(q).text;
ok('rozłóż x^2-5x+6: suma i iloczyn', st('rozłóż x^2-5x+6').some((/** @type {any} */ s) => /sumie/.test(s.label + s.math) && /iloczynie/.test(s.label + s.math)), st('rozłóż x^2-5x+6'));
ok('rozłóż x^2-5x+6: wynik bez zmian', txt('rozłóż x^2-5x+6') === '(x − 2)(x − 3)', txt('rozłóż x^2-5x+6'));
ok('rozłóż x^3-x: wynik bez zmian', txt('rozłóż x^3-x') === 'x(x − 1)(x + 1)', txt('rozłóż x^3-x'));
ok('rozłóż 4x^2-9: postać szkolna', txt('rozłóż 4x^2-9') === '(2x − 3)(2x + 3)', txt('rozłóż 4x^2-9'));
ok('rozłóż 4x^2-9: (2x)² − 3²', st('rozłóż 4x^2-9').some((/** @type {any} */ s) => s.math.includes('(2x)² − 3²')), st('rozłóż 4x^2-9'));
ok('rozłóż x^4-13x^2+36', txt('rozłóż x^4-13x^2+36') === '(x − 2)(x + 2)(x − 3)(x + 3)', txt('rozłóż x^4-13x^2+36'));
ok('rozłóż x^4+5x^2+4: dwa czynniki kwadratowe', txt('rozłóż x^4+5x^2+4') === '(x² + 1)(x² + 4)', txt('rozłóż x^4+5x^2+4'));
ok('rozłóż: ostatni krok to wynik', ['rozłóż x^3-x', 'rozłóż 4x^2-9', 'rozłóż x^4-13x^2+36', 'rozłóż x^3-2x^2+x-2']
    .every(q => st(q).slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(txt(q))));
ok('rozłóż 84', txt('rozłóż 84') === '2² · 3 · 7', txt('rozłóż 84'));
ok('rozłóż 84: dzielenie', st('rozłóż 84').some((/** @type {any} */ s) => s.math.includes('84 : 2 = 42')), st('rozłóż 84'));

// poprawki po przeglądzie
check('x^3-3x+2', ['horner'], r => ok('x³−3x+2: text scala powtórzone czynniki', r.text === '(x − 1)²(x + 2)', r.text));
{
    const q = 'rozłóż x^3+x^2-x-1', s2 = st(q);
    ok(q + ': bez kroku tylko dla przestawienia', !s2.some((/** @type {any} */ s) => s.label === 'Porządkuję czynniki'), s2);
    ok(q + ': ostatni krok to wynik', s2.slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(txt(q)), s2.slice(-1)[0]);
}
ok('rozłóż 2x^3+x^2+2x+1: wynik szkolny', txt('rozłóż 2x^3+x^2+2x+1') === '(2x + 1)(x² + 1)', txt('rozłóż 2x^3+x^2+2x+1'));
ok('rozłóż 2x^3+x^2+2x+1: bez „Porządkuję”', !st('rozłóż 2x^3+x^2+2x+1').some((/** @type {any} */ s) => s.label === 'Porządkuję czynniki'), st('rozłóż 2x^3+x^2+2x+1'));
const fid = (/** @type {string} */ q, /** @type {string} */ id) => st(q).find((/** @type {any} */ s) => s.formula && s.formula.id === id);
ok('x³ + 8: hasło suma-szescianow, b = 2', (fid('rozłóż x^3+8', 'suma-szescianow') || {}).formula?.here === 'a = x, b = 2', st('rozłóż x^3+8'));
ok('x² − 6x + 9: hasło kwadrat-roznicy, b = 3', (fid('rozłóż x^2-6x+9', 'kwadrat-roznicy') || {}).formula?.here === 'a = x, b = 3', st('rozłóż x^2-6x+9'));
ok('grupowanie z minusem: (x³ − 3x²) − (x − 3)', st('rozłóż x^3-3x^2-x+3').some((/** @type {any} */ s) => s.math.includes('(x³ − 3x²) − (x − 3) = ⟦x²(x − 3) − (x − 3)⟧')), st('rozłóż x^3-3x^2-x+3'));
{
    const { whyFor } = require(path.join(__dirname, '..', 'js', 'step-why.js'));
    const w1 = whyFor({ label: 'Porządkuję czynniki', math: '(2x − 3)(2x + 3) = 4(x − 3/2)(x + 3/2)' }, 'Rozkład na czynniki');
    const w2 = whyFor({ label: 'Porządkuję czynniki', math: '(x + 2)(x − 1) = (x − 1)(x + 2)' }, 'Rozkład na czynniki');
    ok('Porządkuję: wyjmowanie liczby', /wyjmuję/.test(w1), w1);
    ok('Porządkuję: samo przestawienie', !/wyjmuję/.test(w2) && /kolejno/.test(w2), w2);
}

// liczba przed iloczynem wchodzi do nawiasów z ułamkiem (postać szkolna wygrywa)
for (const [q, want] of [['rozłóż 2x^3-3x^2-2x+3', '(2x − 3)(x − 1)(x + 1)'], ['rozłóż 2x^4-3x^3-5x^2-2x+5', '(2x − 5)(x³ + x² − 1)'], ['rozłóż 2x^2-3x+1', '(2x − 1)(x − 1)']]) {
    ok(q + ' → ' + want, txt(q) === want, txt(q));
    ok(q + ': ostatni krok to wynik, bez „Porządkuję”', st(q).slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(want) && !st(q).some((/** @type {any} */ s) => s.label === 'Porządkuję czynniki'), st(q));
}
{
    const p = C.polyCoefs('2x^2-3x+1'), r = C.schoolFactor(p.c, p.v, { dec: false });
    ok('schoolFactor(2x²−3x+1).text', r.text === '(2x − 1)(x − 1)', r.text);
}

// współczynniki ułamkowe: najpierw wyłączam ułamek, potem rozkład do końca; bez sklejania liczb
for (const [q, want] of [['rozłóż x^3/2-x/2', '(1/2)x(x − 1)(x + 1)'], ['rozłóż x^2/4-1', '(1/4)(x − 2)(x + 2)'], ['rozłóż x^3/3-x', '(1/3)x(x² − 3)'],
    ['rozłóż x^3/2-x^2/2-x/2+1/2', '(1/2)(x − 1)²(x + 1)'], ['rozłóż x^2/2-1/8', '(1/8)(2x − 1)(2x + 1)']]) {
    ok(q + ' → ' + want, txt(q) === want, txt(q));
    ok(q + ': ostatni krok to wynik', st(q).slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(want), st(q));
}
ok('rozłóż x^2/4-1: wyłączam 1/4', st('rozłóż x^2/4-1').some((/** @type {any} */ s) => s.label === 'Wyłączam wspólny czynnik przed nawias' && s.math.includes('(1/4)(x² − 4)')), st('rozłóż x^2/4-1'));
{
    const p = C.polyCoefs('x^3/2-x^2/2-x/2+1/2'), r = C.schoolFactor(p.c, p.v, { dec: false });
    ok('ułamki: czynniki stopnia ≥ 2 bez pierwiastków wymiernych', r.factors.every((/** @type {any} */ f) => f.c.length === 2), r.factors);
}
// bez sklejania liczby z liczbą (1/8 i 4 → „1/84”) także w starej ścieżce (kilka zmiennych)
for (const q of ['rozłóż x^2y/2-y/8', 'rozłóż x^2/2-1/8', 'rozłóż 2x^2y-3xy+y', 'rozłóż -x^2y/2+y/8'])
    ok(q + ': bez sklejonych liczb', !/[a-z)]\d|\/\d+\(/.test(txt(q)), txt(q));
ok('rozłóż x^2y/2-y/8 → (1/2)y(x − 1/2)(x + 1/2)', txt('rozłóż x^2y/2-y/8') === '(1/2)y(x − 1/2)(x + 1/2)', txt('rozłóż x^2y/2-y/8'));

// liczby dziesiętne przed nawiasem bez nawiasu (jak przed gałęzią): 0,5(x − 2)(x + 2)
ok('rozłóż 0.5x^2-2 → 0,5(x − 2)(x + 2)', txt('rozłóż 0.5x^2-2') === '0,5(x − 2)(x + 2)', txt('rozłóż 0.5x^2-2'));
ok('rozłóż 1.5x^2-6x → 1,5x(x − 4)', txt('rozłóż 1.5x^2-6x') === '1,5x(x − 4)', txt('rozłóż 1.5x^2-6x'));

// kolejność czynników, gdy wygrywa postać szkolna: liniowe wg pierwiastka, potem wyższe stopnie
ok('rozłóż x^6-64: posortowane', txt('rozłóż x^6-64') === '(x − 2)(x + 2)(x² − 2x + 4)(x² + 2x + 4)', txt('rozłóż x^6-64'));
ok('rozłóż x^6-64: ostatni krok to wynik', st('rozłóż x^6-64').slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(txt('rozłóż x^6-64')), st('rozłóż x^6-64').slice(-1)[0]);
ok('rozłóż x^6-1: posortowane', txt('rozłóż x^6-1') === '(x − 1)(x + 1)(x² − x + 1)(x² + x + 1)', txt('rozłóż x^6-1'));

// liczba ujemna: minus przed rozkładem
ok('rozłóż -84 → −2² · 3 · 7', txt('rozłóż -84') === '−2² · 3 · 7', txt('rozłóż -84'));
ok('rozłóż -84: kroki', st('rozłóż -84').some((/** @type {any} */ s) => s.math.includes('84 : 2 = 42')) && st('rozłóż -84').slice(-1)[0].math.endsWith('= −2² · 3 · 7'), st('rozłóż -84'));
{
    const { whyFor } = require(path.join(__dirname, '..', 'js', 'step-why.js'));
    const r = S.run('rozłóż -84');
    ok('rozłóż -84: każdy krok po pierwszym ma „dlaczego”', r.explain.steps.slice(1).every((/** @type {any} */ s, /** @type {number} */ i) => whyFor(s, r.explain.title, r.explain, i + 1)), r.explain.steps.map((/** @type {any} */ s) => s.label));
}

console.log(`school-factor: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
