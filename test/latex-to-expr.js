// Tłumacz LaTeX → zapis parsera (js/latex-to-expr.js).
// Uruchom: node test/latex-to-expr.js
// Bramka: odczyty modelu OCR (test/fixtures/formula-ocr-outputs.json) muszą dać to samo zadanie
// co test/limits-zestaw.json — min. MIN_SAME z 58, i każde trafienie ma się rozwiązać.
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
const C = require(path.join(root, 'js', 'math-calculus.js'))._core;
require(path.join(root, 'js', 'math-limits.js'));
const { latexToExpr } = require(path.join(root, 'js', 'latex-to-expr.js'));
const ZESTAW = require('./limits-zestaw.json');
const OCR = require('./fixtures/formula-ocr-outputs.json');

const MIN_SAME = 51;
const NOPE = 'Jeszcze tego nie rozwiążę';
let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}

const PAIRS = [
    ['\\lim_{n\\to\\infty}\\frac{2n+1}{6n+5}', 'lim n→∞ (2n+1)/(6n+5)'],
    ['\\operatorname* { l i m } _ { x \\to - \\infty } \\frac{x}{\\sqrt{3x^{2}+5}}', 'lim x→-∞ x/sqrt(3x^2+5)'],
    ['\\lim_{n\\to\\infty}\\left(1+\\frac{1}{2n}\\right)^{n}', 'lim n→∞ (1+1/(2n))^n'],
    ['\\sqrt[3]{n^{3}+8n^{2}}', '∛(n^3+8n^2)'],
    ['\\sqrt[4]{x+15}', '∜(x+15)'],
    ['\\sqrt[5]{x}', '(x)^(1/5)'],
    ['\\log_{2}(8n+1)', 'log_2(8n+1)'],
    ['\\log{_{4}}(2n^{2}+3)', 'log_4(2n^2+3)'],
    ['n\\cdot\\left(\\sqrt{4n^{2}+7}\\right)', 'n*(sqrt(4n^2+7))'],
    ['n+1,', 'n+1'], ['n+1.', 'n+1'], ['n+1^', 'n+1'],
    // zdjęcie pod kątem: model czyta „lim” jako \mathop{lim}
    ['\\mathop\\{ { l i m } } _ { n \\to \\infty } \\, \\frac { n } { 2 }', 'lim n→∞ n/2'],
    ['{mathop\\mathrm { l i m } } _ { n \\to \\infty } \\, ( n + 1 )', 'lim n→∞ (n+1)'],
    ['\\mathop\\underset { n \\to \\infty } { l i m } \\; ( n ^ { 3 } )', 'lim n→∞ (n^3)'],
    ['\\  operatorname\\* { l i m } _ { n \\to \\infty } { \\frac { 2 n + 1 } { 6 n + 5 } }', 'lim n→∞ (2n+1)/(6n+5)'],
    ['{ \\mathrm \\  ~ \\operatorname*   l i i  } _ { n \\to \\infty } \\ ( n )', 'lim n→∞ (n)'],
    // ramka złapała koniec etykiety „(b)”
    [') \\ \\operatorname* { l i m } _ { n \\to \\infty } \\ \\frac { n } { 2 }', 'lim n→∞ n/2'],
    ['| \\ \\operatorname*   l i i  _{{ x \\rightarrow \\infty } } \\ \\frac { x } { 2 }', 'lim x→∞ x/2'],
    ['\\mathop { l i m } _ { n \\to \\infty } \\, \\frac { n ^ { 2 } + 3 n + 4 } { 2 n ^ { 2 } + 5 n + 1 }', 'lim n→∞ (n^2+3n+4)/(2n^2+5n+1)'],
];
for (const [l, e] of PAIRS) { const r = latexToExpr(l); ok(l, r.expr === e && !r.uncertain, r); }
// jeden nieznany znak (minus odczytany jako \|) nie odrzuca wzoru: „?” w zapisie + uncertain
for (const [l, e] of [
    ['\\lim_{n\\to\\infty}\\left(\\frac{5n+7}{5n \\| 8}\\right)^{n}', 'lim n→∞ ((5n+7)/(5n ? 8))^n'],
    ['\\frac{\\|}{2}', '(?)/2'],
    ['\\lim_{n\\to\\infty}\\left(1\\pm\\frac{1}{2n}\\right)^{n}', 'lim n→∞ (1 ? 1/(2n))^n'],
]) { const r = latexToExpr(l); ok('niepewne: ' + l, r.expr === e && r.uncertain === true, r); }
// śmieci zamiast jednego znaku: rozsypane litery, kilka „?” → błąd; „?” na końcu odpada; \\\\frac = \\frac
ok('\\fracfrac to \\frac', latexToExpr('x+\\fracfrac{1}{2}').expr === 'x+1/2', latexToExpr('x+\\fracfrac{1}{2}'));
ok('\\\\frac to \\frac', latexToExpr('\\\\frac{1}{2}').expr === '1/2' && !latexToExpr('\\\\frac{1}{2}').uncertain, latexToExpr('\\\\frac{1}{2}'));
ok('„?” na końcu odpada', latexToExpr('n+1 \\foo').expr === 'n+1' && !latexToExpr('n+1 \\foo').uncertain, latexToExpr('n+1 \\foo'));
for (const l of ['\\lim_{n\\to\\infty} \\foo f r a c n', '\\alpha+\\beta+\\gamma+1', 'n^{+}+1', 'n--1', 'x/{.}', 'n+'])
    ok('śmieci → błąd: ' + l, typeof latexToExpr(l).error === 'string', latexToExpr(l));
// indeks z \\to tylko po literach na początku: \\frac przed nim to nie głowa granicy
ok('\\frac{1}{x}_{n\\to 1} nie staje się granicą', !/^lim/.test(latexToExpr('\\frac{1}{x}_{n\\to 1}').expr || ''), latexToExpr('\\frac{1}{x}_{n\\to 1}'));
for (const l of ['\\begin{array}{l}x\\end{array}', '\\alpha', '\\| \\|', '\\frac{1}{', '\\lim_{n\\to\\infty}\\left(\\frac{n}{n+3}\\right', ''])
    ok('błąd: ' + l, typeof latexToExpr(l).error === 'string', latexToExpr(l));

// ── zestaw: ta sama zmienna, cel i wartości ciała w punktach próbnych ──
const split = s => { const m = /^lim\s*([a-z])\s*→\s*(\S+?)\s+(.*)$/.exec(s); return m && { v: m[1], at: m[2], body: m[3] }; };
const val = (body, v, x) => { try { return C.evalExpr(C.fromAst(S._core.parse(body)), { [v]: x }); } catch { return NaN; } };
const pts = at => at === '∞' ? [1.3, 2.3, 3.7, 5.1, 7.9, 12.4] : at === '-∞' ? [-1.3, -2.3, -3.7, -5.1, -7.9, -12.4]
    : [0.13, 0.37, -0.21, 0.29, -0.43, 0.61].map(d => +at + d);
let same = 0;
const misses = [];
for (const z of ZESTAW) {
    const tr = latexToExpr(OCR[z.id] || '');
    const g = split(z.input), o = tr.expr && split(tr.expr);
    let good = !!(o && o.v === g.v && o.at === g.at), cmp = 0;
    if (good) for (const x of pts(g.at)) {
        const a = val(g.body, g.v, x), b = val(o.body, o.v, x);
        if (Number.isNaN(a) && Number.isNaN(b)) continue;
        cmp++;
        if (!(a === b || Math.abs(a - b) <= 1e-9 * (1 + Math.abs(a)))) { good = false; break; }
    }
    if (cmp < 3) good = false;
    if (!good) { misses.push(z.id); continue; }
    same++;
    const run = S.run(tr.expr);
    ok(z.id + ' rozwiązuje się: ' + tr.expr, run && run.text && run.text !== NOPE, run && run.text);
}
ok('zestaw ≥ ' + MIN_SAME + '/58 (jest ' + same + ')', same >= MIN_SAME, misses);
console.log('zestaw: ' + same + '/58, pudła: ' + misses.join(' '));
console.log(fail ? '❌ ' + fail + ' błędów, ' + pass + ' ok' : '✅ ' + pass + ' ok');
process.exit(fail ? 1 : 0);
