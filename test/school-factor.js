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
    ok(src + ': każdy krok ma dymek albo jest złożeniem', r.steps.every((/** @type {any} */ s) => s.formula || /^(Składam całość|Szukam pierwiastka|Odczytuję|Liczę)/.test(s.label)), r.steps.map((/** @type {any} */ s) => s.label));
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
ok('rozłóż 4x^2-9: wynik bez zmian', txt('rozłóż 4x^2-9') === '4(x − 3/2)(x + 3/2)', txt('rozłóż 4x^2-9'));
ok('rozłóż 4x^2-9: (2x)² − 3²', st('rozłóż 4x^2-9').some((/** @type {any} */ s) => s.math.includes('(2x)² − 3²')), st('rozłóż 4x^2-9'));
ok('rozłóż x^4-13x^2+36', txt('rozłóż x^4-13x^2+36') === '(x − 2)(x + 2)(x − 3)(x + 3)', txt('rozłóż x^4-13x^2+36'));
ok('rozłóż x^4+5x^2+4: dwa czynniki kwadratowe', txt('rozłóż x^4+5x^2+4') === '(x² + 1)(x² + 4)', txt('rozłóż x^4+5x^2+4'));
ok('rozłóż: ostatni krok to wynik', ['rozłóż x^3-x', 'rozłóż 4x^2-9', 'rozłóż x^4-13x^2+36', 'rozłóż x^3-2x^2+x-2']
    .every(q => st(q).slice(-1)[0].math.replace(/[⟦⟧]/g, '').endsWith(txt(q))));
ok('rozłóż 84', txt('rozłóż 84') === '2² · 3 · 7', txt('rozłóż 84'));
ok('rozłóż 84: dzielenie', st('rozłóż 84').some((/** @type {any} */ s) => s.math.includes('84 : 2 = 42')), st('rozłóż 84'));

console.log(`school-factor: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
