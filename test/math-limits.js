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

const MIN_COVERED = 47; // [EN] ≥ 80% z 58 (spec 5.7, etap 1)
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

// ── Task 7: 1^∞ przez liczbę e ─────────────────────────────
{
    const WANT6 = { '6a': '1/e', '6b': '√e', '6c': 'e⁴', '6d': '1/e⁶', '6e': '1', '6f': 'e³', '6h': 'e⁹' };
    ['6a', '6b', '6c', '6d', '6e', '6f', '6g', '6h', '6i', '6j'].forEach(id => {
        const r = S.run(byId[id].input);
        ok('zadanie ' + id, r && r.text !== NOPE && agrees(r.value, byId[id].value) && r.explain.steps.length >= 3, r && r.text);
        if (WANT6[id]) ok('zadanie ' + id + ' tekst', r && r.text === WANT6[id], r && r.text);
    });
    const r = S.run(byId['6d'].input), st = r && r.explain ? r.explain.steps : [];
    ok('6d: [1^∞] w pierwszym kroku', st.length && st[0].math.includes('[1^∞]'), st[0]);
    // spec 5.12: bez osobnego kroku „Wzór na e” — wzór podkreślony (⟦…⟧) w kroku, w którym działa
    ok('6d: bez kroku „Wzór na e”', !st.some(x => x.label === 'Wzór na e'), st.map(x => x.label));
    ok('6d: krok z podkreślonym wzorem na e', st.some(x => x.formula && x.formula.id === 'e' && /⟦\(1 \+ .*⟧/.test(x.math)), st.map(x => x.label + ': ' + x.math));
    ok('6d: krok z aₙ = ', st.some(x => x.math.includes('aₙ = ')), st.map(x => x.math));
    ok('6d: wykładnik → −6', st.some(x => /→ −6$/.test(x.math)), st.map(x => x.math));
    // (1 − 1/n)^n: jedynka dorobiona naprawdę, długi krok bez ucięcia, wykładnik stały = jeden krok
    const e1 = (S.run('lim n→∞ (1-1/n)^n') || {}).explain, s1 = e1 ? e1.steps : [];
    ok('(1−1/n)^n: 1 − 1/n = 1 + 1/(−n)', s1.some(x => x.label === 'Dorabiamy jedynkę' && x.math.startsWith('1 − 1/n = 1 + 1/(−n),')), s1.map(x => x.math));
    ok('(1−1/n)^n: podstawa → e w jednym kroku z wykładnikiem', s1.some(x => x.label === 'Podstawa dąży do e' && x.math.endsWith('[⟦(1 + 1/(−n))^(−n)⟧]^(−1) = e^(−1)')), s1.map(x => x.math));
    ok('(1−1/n)^n: stały wykładnik bez osobnego kroku', !s1.some(x => /^(Granica wykładnika|Wykładnik)$/.test(x.label)), s1.map(x => x.label));
    ok('6d: 1 + (−3/(n + 3))', st.some(x => x.label === 'Dorabiamy jedynkę' && x.math.includes('= 1 + (−3/(n + 3))')), st.map(x => x.math));
    const s2 = ((S.run('lim n→∞ (1+1/(2n))^n') || {}).explain || { steps: [] }).steps;
    ok('(1+1/(2n))^n: bez tautologii, aₙ w nawiasie', s2.some(x => x.math === '1 + 1/(2n),  aₙ = 2n') && s2.some(x => x.math.includes('^(2n)⟧]^(1/2)')), s2.map(x => x.math));
}

// ── Task 8: punkt skończony 0/0 ────────────────────────────
['8a', '8b', '8c', '8d', '8e', '8f', '9a', '9b', '9c', '9d', '9e', '9f'].forEach(id => {
    const r = S.run(byId[id].input);
    ok('zadanie ' + id, r && r.text !== NOPE && agrees(r.value, byId[id].value) && r.explain.steps.length >= 3, r && r.text);
});
{
    const st8 = (S.run(byId['8a'].input) || {}).explain;
    const s8 = st8 ? st8.steps : [];
    ok('8a: [0/0] w pierwszym kroku', s8.length && /\[0\/0\]$/.test(s8[0].math), s8[0]);
    ok('8a: Rozkładamy na czynniki (x − 4)(x − 2)/((x − 4)(3x + 2))', s8.some(x => x.label === 'Rozkładamy na czynniki' && x.math.includes('(x − 4)(x − 2)/((x − 4)(3x + 2))')), s8.map(x => x.label + ': ' + x.math));
    ok('8a: Skracamy (x − 4)', s8.some(x => x.label === 'Skracamy (x − 4)'), s8.map(x => x.label));
    ok('8a tekst 1/7', text(byId['8a'].input) === '1/7', text(byId['8a'].input));
    const s9 = ((S.run(byId['9e'].input) || {}).explain || { steps: [] }).steps;
    ok('9e: sprzężenie a⁴ − b⁴', s9.some(x => x.label.includes('a⁴ − b⁴')), s9.map(x => x.label));
    ok('9e tekst −1/96', text(byId['9e'].input) === '−1/96', text(byId['9e'].input));
}

// ── Task 9: granice znane, jednostronne, de l'Hospital ─────
{
    const lab = q => { const r = S.run(q); return r && r.explain ? r.explain.steps : []; };
    ok('sin(x)/x = 1', text('lim x→0 sin(x)/x') === '1', text('lim x→0 sin(x)/x'));
    ok('sin(3x)/x = 3', text('lim x→0 sin(3x)/x') === '3', text('lim x→0 sin(3x)/x'));
    const st = lab('lim x→0 sin(3x)/x');
    ok('sin(3x)/x: krok sin u/u → 1 z u = 3x', st.some(x => x.label.includes('sin u/u → 1') && x.math.includes('u = 3x')), st.map(x => x.label + ': ' + x.math));
    ok('(eˣ−1)/x = 1', text('lim x→0 (e^x-1)/x') === '1', text('lim x→0 (e^x-1)/x'));
    ok('ln(1+2x)/x = 2', text('lim x→0 ln(1+2x)/x') === '2', text('lim x→0 ln(1+2x)/x'));
    ok('x/sin(x) = 1', text('lim x→0 x/sin(x)') === '1', text('lim x→0 x/sin(x)'));
    ok('(1+x)^(1/x) = e', text('lim x→0 (1+x)^(1/x)') === 'e', text('lim x→0 (1+x)^(1/x)'));
    ok('(x − sin x)/x³ = 1/6', text('lim x→0 (x - sin(x))/x^3') === '1/6', text('lim x→0 (x - sin(x))/x^3'));
    ok('de l\'Hospital w krokach', lab('lim x→0 (x - sin(x))/x^3').some(x => x.label === "Reguła de l'Hospitala"), lab('lim x→0 (x - sin(x))/x^3').map(x => x.label));
    ok('1/x przy 0⁺ = +∞', text('lim x→0+ 1/x') === '+∞', text('lim x→0+ 1/x'));
    ok('1/x przy 0⁻ = −∞', text('lim x→0- 1/x') === '−∞', text('lim x→0- 1/x'));
    ok('1/x przy 0 — nie istnieje', text('lim x→0 1/x') === 'granica nie istnieje', text('lim x→0 1/x'));
    const dn = lab('lim x→0 1/x');
    ok('nie istnieje: krok z obiema stronami', dn.some(x => x.math.includes('0⁻') && x.math.includes('0⁺')), dn.map(x => x.math));
    ok('1/x² przy 0 = +∞', text('lim x→0 1/x^2') === '+∞', text('lim x→0 1/x^2'));
    ok('sin(1/x) przy 0 → NOPE', text('lim x→0 sin(1/x)') === NOPE, text('lim x→0 sin(1/x)'));
}

// ── Przegląd kontrolny (po Task 3): błędy znalezione przez recenzenta ──
ok('C1: lim x→−1 √(x²) ≠ −1 (|x|, nie x)', text('lim x→-1 sqrt(x^2)') !== '−1', text('lim x→-1 sqrt(x^2)'));
ok('C1: pochodna √(x²) ≠ 1', text('pochodna sqrt(x^2)') !== 'f′(x) = 1', text('pochodna sqrt(x^2)'));
if (L && L.numericLimit) {
    const r = L.numericLimit(expr('x/sqrt(x^2+1)'), 'x', { at: '-inf', side: 0 });
    ok('C1: numeric x/√(x²+1) przy −∞ → −1', r && r.kind === 'num' && near(r.value, -1, 1e-6), r);
    let t0 = Date.now();
    L.numericLimit(expr('sin(x^100)'), 'x', { at: 'inf', side: 0 });
    ok('C2: sin(x¹⁰⁰) liczy się szybko', Date.now() - t0 < 2000, (Date.now() - t0) + ' ms');
    t0 = Date.now();
    const after = text('lim x→∞ (2x+1)/(x+3)');
    ok('C2: po sin(x¹⁰⁰) zwykła granica dalej szybka', after === '2' && Date.now() - t0 < 300, after + ' ' + (Date.now() - t0) + ' ms');
    t0 = Date.now();
    L.numericLimit(expr('sin(e^x)'), 'x', { at: 'inf', side: 0 });
    ok('C2: sin(eˣ) nie wisi', Date.now() - t0 < 2000, (Date.now() - t0) + ' ms');
    ok('I1: sin(πx) przy ∞ nie rozstrzyga', L.numericLimit(expr('sin(pi x)'), 'x', { at: 'inf', side: 0 }) === null);
    ok('I1: cos(2πx) przy ∞ nie rozstrzyga', L.numericLimit(expr('cos(2 pi x)'), 'x', { at: 'inf', side: 0 }) === null);
    ok('I1: sin(π/x) przy 0 nie rozstrzyga', !(L.numericLimit(expr('sin(pi/x)'), 'x', { at: 0, side: 0 }) || {}).kind);
}
if (L && L.detect) {
    const d1 = L.detect('lim_{x\\to2} x^2');
    ok('I2: lim_{x\\to2}', d1 && d1.target.at === 2, d1);
    const d2 = L.detect('lim x \\to \\infty 1/x');
    ok('I2: \\infty', d2 && d2.target.at === 'inf', d2);
    const d3 = L.detect('\\lim_{x\\to 0} x');
    ok('I2: \\lim', d3 && d3.target.at === 0, d3);
    const d4 = L.detect('lim x→0⁺ x'), d5 = L.detect('lim x→0^+ x'), d6 = L.detect('lim x→0⁻ x');
    ok('I3: 0⁺ / 0^+ / 0⁻', d4 && d4.target.side === 1 && d5 && d5.target.side === 1 && d6 && d6.target.side === -1, [d4, d5, d6]);
    const d7 = L.detect('lim x→0 - 1/x');
    ok('minor: „x→0 - 1/x” to granica −1/x, nie lewostronna', d7 && d7.target.side === 0 && /^- ?1\/x$/.test(d7.src), d7);
}
{
    const lg = S.run('pochodna log_0(x)');
    ok('minor: log_0 nie jest logarytmem', !lg || lg.text === NOPE || !/ln\(0\)/.test(lg.text), lg && lg.text);
}
ok('minor: „krok po kroku” na końcu', text('lim x→2 x^2 krok po kroku') === '4', text('lim x→2 x^2 krok po kroku'));
// [EN] ∛ z liczby ujemnej przy podstawianiu: silnik (cPow) tego nie umie — odłożone; ważne, że nie ma złego wyniku
ok('minor: lim x→−8 ∛x nie daje złego wyniku', ['−2', NOPE].includes(text('lim x→-8 ∛x')), text('lim x→-8 ∛x'));

// ── Przegląd kontrolny 2 (po Task 9) ───────────────────────
{
    const st = q => { const r = S.run(q); return r && r.explain ? r.explain.steps : []; };
    // I1: podstawienie nie może „liczyć” ln(0), cot(0) ani skracać ln(0) − ln(0)
    const xl = st('lim x→0+ x·ln(x)');
    ok('I1: x·ln(x) bez fałszywego „Podstawiamy x = 0”', !xl.some(x => /^Podstawiamy/.test(x.label)), xl.map(x => x.label + ': ' + x.math));
    const lnl = st('lim x→0+ ln(sin(x))-ln(x)');
    ok('I1: ln(sin x) − ln x bez fałszywego podstawienia', !lnl.some(x => /^Podstawiamy/.test(x.label) && /= 0$/.test(x.math)), lnl.map(x => x.label + ': ' + x.math));
    ok('I1: ln(2x) − ln(x) = ln 2 (logarytmy łączą się, a nie podstawienie)', /ln\(2\)|ln 2/.test(text('lim x→0+ ln(2x)-ln(x)') || ''), text('lim x→0+ ln(2x)-ln(x)'));
    if (L && L._internal) {
        let got = null;
        try { got = L._internal.limitOf(expr('x cot(x)'), 'x', { at: 0, side: 0, src: '0' }, [], 0); } catch (e) { got = 'NOPE'; }
        ok('I1: reguły nie dają 0 dla x·ctg(x)', got === 'NOPE' || (got.kind === 'num' && Math.abs(C.evalExpr(got.e, {}) - 1) < 1e-9), got);
    }
    // I2: aliasing z siatką próbek — oscylacja nie może przejść jako 1
    ok('I2: sin(sin(πx/√2))/sin(πx/√2) przy ∞ ≠ 1', text('lim x→∞ sin(sin(pi x/sqrt(2)))/sin(pi x/sqrt(2))') !== '1', text('lim x→∞ sin(sin(pi x/sqrt(2)))/sin(pi x/sqrt(2))'));
    // I3: liczone przy każdym znaku — żadne wejście nie może trwać sekundami
    ['lim x→-∞ (∛(x^3+x)-∛(x^3-x))', 'lim x→-∞ ∛(x^3+x^2)-x', 'lim x→0 (tan(tan(x))-sin(sin(x)))/(tan(x)-sin(x))', 'lim x→0 (1/x^2-1/sin(x)^2)'].forEach(q => {
        const t0 = Date.now(); S.run(q); const ms = Date.now() - t0;
        ok('I3: < 600 ms: ' + q, ms < 600, ms + ' ms');
    });
}

// ── Zestaw 58 zadań ─────────────────────────────────────────
let covered = 0, wrong = 0;
const missing = [];
let slowest = { id: '', ms: 0 };
for (const z of ZESTAW) {
    const t0 = Date.now();
    const r = S.run(z.input);
    const ms = Date.now() - t0;
    if (ms > slowest.ms) slowest = { id: z.id, ms };
    if (!r || r.text === NOPE) { missing.push(z.id); continue; }
    if (!agrees(r.value, z.value)) { wrong++; console.log('  ✗ BŁĘDNY WYNIK', z.id, r.text, 'chcę', z.sympy); continue; }
    if (r.explain && r.explain.steps.length >= 2) covered++; else missing.push(z.id);
}
console.log(`zestaw: ${covered}/${ZESTAW.length} z krokami, ${wrong} błędnych` + (missing.length ? ` · bez: ${missing.join(' ')}` : ''));
ok('zestaw: 0 błędnych', wrong === 0, wrong);
ok('zestaw: pokrycie ≥ ' + MIN_COVERED, covered >= MIN_COVERED, covered);
console.log(`zestaw: najwolniejsze ${slowest.id} — ${slowest.ms} ms`);
// [EN] liczone przy każdym znaku — budżet 300 ms (pomiar zimny: wynik nie z pamięci podręcznej)
ok('zestaw: każde zadanie < 300 ms', slowest.ms < 300, slowest);

console.log(`math-limits: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
