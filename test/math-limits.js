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
function agrees(got, want) {
    if (want === 'inf') return got === Infinity;
    if (want === '-inf') return got === -Infinity;
    return typeof got === 'number' && Math.abs(got - want) <= 1e-9 * (1 + Math.abs(want));
}

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

// ── Task 3: komenda, podstawienie, bramka pewności ─────────
if (L && L.detect) {
    const same = (q, v, at, side) => {
        const d = L.detect(q);
        ok('detect: ' + q, d && d.v === v && d.target.at === at && (d.target.side || 0) === (side || 0), d);
    };
    ['granica x^2+1 przy x → 2', 'granica x^2+1 przy x do 2', 'granica x^2+1 dla x→2', 'lim x->2 x^2+1',
        'lim(x→2) x^2+1', 'lim_{x\\to 2} x^2+1', 'limit x^2+1 as x->2', 'Granica x^2+1 przy x → 2']
        .forEach(q => same(q, 'x', 2));
    same('lim x→0+ 1/x', 'x', 0, 1);
    same('granica 1/x przy x do 0 z prawej', 'x', 0, 1);
    same('lim x→0- 1/x', 'x', 0, -1);
    same('lim x → ∞ 1/x', 'x', 'inf');
    same('lim x→+∞ 1/x', 'x', 'inf');
    same('lim x → -∞ 1/x', 'x', '-inf');
    same('lim x → −∞ 1/x', 'x', '-inf');
    same('granica 1/x przy x do nieskończoności', 'x', 'inf');
    same('lim n→inf 1/n', 'n', 'inf');
    ok('detect: zwykłe działanie to nie granica', L.detect('2+2') === null && L.detect('pochodna x^2') === null);
} else ok('detect istnieje', false);
ok('granica x^2+1 przy x → 2 = 5', text('granica x^2+1 przy x → 2') === '5', text('granica x^2+1 przy x → 2'));
{
    const r = S.run('granica x^2+1 przy x → 2');
    const first = r && r.explain && r.explain.steps[0].math;
    ok('pierwszy krok: lim … = 5', r && r.explain && /lim/.test(first) && r.explain.steps.some(st => /= 5$/.test(st.math)), r && r.explain);
}
ok('lim x→0 cos(x) = 1', text('lim x→0 cos(x)') === '1', text('lim x→0 cos(x)'));
ok('niedokończone: granica (x^2+1', S.run('granica (x^2+1') === null, S.run('granica (x^2+1'));
ok('niedokończone: granica', S.run('granica') === null);
if (L && L._test) {
    L._test.pushRule({ name: 'kłamca', test: () => true, apply: () => ({ kind: 'num', e: C.num(S._core.R(7)) }) });
    ok('bramka: zły wynik reguły → NOPE', text('lim x→∞ 1/x') === NOPE, text('lim x→∞ 1/x'));
    L._test.popRule();
    const F = L._test.formatAnswer, E = C.E_CONST, R = S._core.R;
    const ePow = r => C.cPow(E, r);
    ok('format e^(−6) → 1/e⁶', F({ kind: 'num', e: ePow(R(-6)) }).text === '1/e⁶', F({ kind: 'num', e: ePow(R(-6)) }));
    ok('format e^(1/2) → √e', F({ kind: 'num', e: ePow(R(1, 2)) }).text === '√e', F({ kind: 'num', e: ePow(R(1, 2)) }));
    ok('format e^(−1) → 1/e', F({ kind: 'num', e: ePow(R(-1)) }).text === '1/e');
    ok('format e^4 → e⁴', F({ kind: 'num', e: ePow(R(4)) }).text === 'e⁴');
    const s3 = C.cMul(C.num(R(1, 3)), C.cPow(C.num(R(3)), R(1, 2)));
    ok('format √3/3', F({ kind: 'num', e: s3 }).text === '√3/3', F({ kind: 'num', e: s3 }));
    ok('format +∞', F({ kind: 'inf', sign: 1 }).text === '+∞' && F({ kind: 'inf', sign: 1 }).value === Infinity);
    ok('format −∞', F({ kind: 'inf', sign: -1 }).text === '−∞' && F({ kind: 'inf', sign: -1 }).value === -Infinity);
    ok('format nie istnieje', F({ kind: 'dne', why: '' }).text === 'granica nie istnieje' && F({ kind: 'dne', why: '' }).value === null);
} else ok('_test istnieje', false);
{
    const t0 = Date.now();
    S.run('lim n→∞ ((2n^2+3)^2(5n+2)^5(n+6))/((4n^3+5)^3(3n+7)^2)');
    const dt = Date.now() - t0;
    ok('czas 1g < 300 ms', dt < 300, dt + ' ms');
}

// ── Task 4: wyłączanie najwyższej potęgi ───────────────────
const byId = Object.fromEntries(ZESTAW.map(z => [z.id, z]));
const WANT_TEXT = { '1a': '1/3', '1d': '0', '1e': '+∞', '7a': '√3/3', '7b': '−√3/3', '3a': '+∞', '2c': '4/5', '1f': '3' };
['1a', '1b', '1c', '1d', '1e', '1f', '1g', '2a', '2b', '2c', '2d', '2e', '2f', '3a', '7a', '7b'].forEach(id => {
    const r = S.run(byId[id].input);
    ok('zadanie ' + id, r && r.text !== NOPE && agrees(r.value, byId[id].value) && r.explain.steps.length >= 3, r && r.text);
    if (WANT_TEXT[id]) ok('zadanie ' + id + ' tekst', r && r.text === WANT_TEXT[id], r && r.text);
});
{
    const r = S.run(byId['1b'].input), st = r && r.explain ? r.explain.steps : [];
    ok('1b: pierwszy krok kończy się [∞/∞]', st.length && /\[∞\/∞\]$/.test(st[0].math), st[0]);
    ok('1b: krok „Wyłączamy n² przed nawias”', st.some(x => x.label === 'Wyłączamy n² przed nawias'), st.map(x => x.label));
    const b = S.run(byId['7b'].input), sb = b && b.explain ? b.explain.steps : [];
    ok('7b: krok √(x²) = |x| = −x', sb.some(x => /√\(x²\) = \|x\| = −x/.test(x.math)), sb.map(x => x.math));
}

// ── Task 5: wspólny mianownik i logarytmy ──────────────────
['3b', '3c', '3d', '3e'].forEach(id => {
    const r = S.run(byId[id].input);
    ok('zadanie ' + id, r && r.text !== NOPE && agrees(r.value, byId[id].value) && r.explain.steps.length >= 3, r && r.text);
});
{
    const r = S.run('lim x→0 (1/(x+1) - 1)/x'), st = r && r.explain ? r.explain.steps : [];
    ok('ułamek piętrowy = −1', r && r.text === '−1', r && r.text);
    ok('ułamek piętrowy: krok wspólnego mianownika', st.some(x => x.label === 'Sprowadzamy do wspólnego mianownika'), st.map(x => x.label));
    const d = S.run(byId['3d'].input), sd = d && d.explain ? d.explain.steps : [];
    ok('3d: krok log₂((8n + 1)/(n + 6))', sd.some(x => /log₂\(\(8n \+ 1\)\/\(n \+ 6\)\)/.test(x.math)), sd.map(x => x.math));
    ok('3d tekst = 3', d && d.text === '3', d && d.text);
    ok('3e tekst = −3/2', text(byId['3e'].input) === '−3/2', text(byId['3e'].input));
}

// ── Task 6: sprzężenie ─────────────────────────────────────
['4a', '4b', '4c', '4d', '4e', '4f', '4g', '4h', '5a', '5b', '5c', '5d', '5e', '7c', '7d', '7e'].forEach(id => {
    const r = S.run(byId[id].input);
    ok('zadanie ' + id, r && r.text !== NOPE && agrees(r.value, byId[id].value) && r.explain.steps.length >= 3, r && r.text);
});
{
    const steps = id => { const r = S.run(byId[id].input); return r && r.explain ? r.explain.steps : []; };
    const a = steps('4a');
    ok('4a: Mnożymy przez sprzężenie', a.some(x => /^Mnożymy przez sprzężenie/.test(x.label)), a.map(x => x.label));
    ok('4a: (2n + 5 − (2n + 1))/(√(2n + 5) + √(2n + 1))', a.some(x => x.math.includes('(2n + 5 − (2n + 1))/(√(2n + 5) + √(2n + 1))')), a.map(x => x.math));
    ok('5a: wzór a³ − b³', steps('5a').some(x => x.label.includes('a³ − b³ = (a − b)(a² + ab + b²)')), steps('5a').map(x => x.label));
    ok('5d: wzór a⁴ − b⁴', steps('5d').some(x => x.label.includes('a⁴ − b⁴')), steps('5d').map(x => x.label));
    ok('4g: Rozbijamy na dwie różnice', steps('4g').some(x => x.label === 'Rozbijamy na dwie różnice'), steps('4g').map(x => x.label));
    ok('4b tekst 2√3', text(byId['4b'].input) === '2√3', text(byId['4b'].input));
    ok('7d tekst −3√2/4', text(byId['7d'].input) === '−3√2/4', text(byId['7d'].input));
}

// ── Zestaw 58 zadań ─────────────────────────────────────────
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
