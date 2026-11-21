// Granice krok po kroku (js/math-limits.js).
// Uruchom: node test/math-limits.js
// Bramka: zestaw 58 zadań z ćwiczeń (test/limits-zestaw.json) — 0 błędnych wyników zawsze,
// pokrycie z krokami co najmniej MIN_COVERED.
'use strict';
const path = require('path');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));
require(path.join(__dirname, '..', 'js', 'math-calculus.js'));
let L = null;
try { L = require(path.join(__dirname, '..', 'js', 'math-limits.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
const ZESTAW = require('./limits-zestaw.json');

const MIN_COVERED = 0;
const NOPE = 'Jeszcze tego nie rozwiążę';
let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
const text = q => { const r = S.run(q); return r && r.text; };

const CALC = require(path.join(__dirname, '..', 'js', 'math-calculus.js'));
const C = CALC._core || {};
const expr = src => C.fromAst(S._core.parse(src));
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-9) * (1 + Math.abs(b));

// ── Task 2: pierwiastki n-tego stopnia, log o podstawie, sprawdzenie liczbowe ──
ok('_core wystawiony', typeof C.fromAst === 'function' && typeof C.show === 'function' && typeof C.evalExpr === 'function');
if (C.fromAst) {
    ok('∛(x+1) = (x+1)^(1/3)', near(C.evalExpr(expr('∛(x+1)'), { x: 7 }), 2));
    ok('cbrt(x+1) = (x+1)^(1/3)', near(C.evalExpr(expr('cbrt(x+1)'), { x: 26 }), 3));
    ok('∜x = x^(1/4)', near(C.evalExpr(expr('∜x'), { x: 16 }), 2));
    ok('log_2(8) = 3', near(C.evalExpr(expr('log_2(x)'), { x: 8 }), 3));
    ok('log2(x) też', near(C.evalExpr(expr('log2(x)'), { x: 32 }), 5));
    ok('pokaz ∛', /∛/.test(C.show(expr('∛(x+1)'))), C.show(expr('∛(x+1)')));
    ok('pokaz log₂', /log₂\(/.test(C.show(expr('log_2(x)'))), C.show(expr('log_2(x)')));
}
{
    const d1 = S.run('pochodna ∛x');
    ok('pochodna ∛x liczy się', d1 && d1.text !== NOPE, d1 && d1.text);
    const d2 = S.run('pochodna log_2(x)');
    ok('pochodna log_2(x) liczy się', d2 && d2.text !== NOPE, d2 && d2.text);
}
if (L && L.numericLimit && C.fromAst) {
    const INF = { at: 'inf', side: 0 };
    const r1 = L.numericLimit(expr('(2n+1)/(6n+5)'), 'n', INF);
    ok('numeric (2n+1)/(6n+5) → 1/3', r1 && r1.kind === 'num' && near(r1.value, 1 / 3, 1e-6), r1);
    const r2 = L.numericLimit(expr('sqrt(n^4+n^3)+sqrt(n^4-n^3)-2n^2'), 'n', INF);
    ok('numeric 4h → −1/4 (precyzja)', r2 && r2.kind === 'num' && near(r2.value, -0.25, 1e-6), r2);
    const r3 = L.numericLimit(expr('n^3-5n^2'), 'n', INF);
    ok('numeric n³−5n² → +∞', r3 && r3.kind === 'inf' && r3.sign === 1, r3);
    const r4 = L.numericLimit(expr('sin(1/x)'), 'x', { at: 0, side: 0 });
    ok('numeric sin(1/x) przy 0 → nie rozstrzyga', r4 === null, r4);
    let threw = false, r5 = null;
    try { r5 = L.numericLimit(expr('sqrt(4n-7)/sqrt(n)'), 'n', INF); } catch (e) { threw = true; }
    ok('numeric poza dziedziną bez wyjątku', !threw && r5 && r5.kind === 'num' && near(r5.value, 2, 1e-6), r5);
    const r6 = L.numericLimit(expr('(n^2+6n+9)^(n^2+6n)/(n^2+6n)^(n^2+6n)'), 'n', INF);
    ok('numeric 6h-podobne (ogromne potęgi) → e⁹', r6 && r6.kind === 'num' && near(r6.value, Math.exp(9), 1e-4), r6);
    const r7 = L.numericLimit(expr('(5n+∛(n^4+1))/(2n+6∜(n^5+3))'), 'n', INF);
    ok('numeric wolny wzrost n^(1/12) → +∞', r7 && r7.kind === 'inf' && r7.sign === 1, r7);
    const r8 = L.numericLimit(expr('1/x'), 'x', { at: 0, side: 0 });
    ok('numeric 1/x przy 0 → różne strony', r8 && r8.kind === 'sides', r8);
} else ok('numericLimit istnieje', false);

// ── Zestaw 58 zadań ─────────────────────────────────────────
function agrees(got, want) {
    if (want === 'inf') return got === Infinity;
    if (want === '-inf') return got === -Infinity;
    return typeof got === 'number' && Math.abs(got - want) <= 1e-9 * (1 + Math.abs(want));
}
let covered = 0, wrong = 0;
const missing = [];
for (const z of ZESTAW) {
    const r = S.run(z.input);
    if (!r || r.text === NOPE) { missing.push(z.id); continue; }
    if (!agrees(r.value, z.value)) { wrong++; console.log('  ✗ BŁĘDNY WYNIK', z.id, r.text, 'chcę', z.sympy); continue; }
    if (r.explain && r.explain.steps.length >= 2) covered++; else missing.push(z.id);
}
console.log(`zestaw: ${covered}/${ZESTAW.length} z krokami, ${wrong} błędnych` + (missing.length ? ` · bez: ${missing.join(' ')}` : ''));
ok('zestaw: 0 błędnych', wrong === 0, wrong);
ok('zestaw: pokrycie ≥ ' + MIN_COVERED, covered >= MIN_COVERED, covered);

console.log(`math-limits: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
