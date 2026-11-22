// Rysunek wzoru: zapis pola → LaTeX (js/expr-to-latex.js).
// Uruchom: node test/expr-to-latex.js
// Bramka: każdy z 58 wzorów zestawu granic, narysowany i odczytany z powrotem (latexToExpr),
// daje to samo zadanie (zmienna, cel, wartości w punktach próbnych) — rysunek nie kłamie.
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const { exprToLatex } = require(path.join(root, 'js', 'expr-to-latex.js'));
const { latexToExpr } = require(path.join(root, 'js', 'latex-to-expr.js'));
const S = require(path.join(root, 'js', 'math-steps.js'));
const C = require(path.join(root, 'js', 'math-calculus.js'))._core;
const ZESTAW = require('./limits-zestaw.json');

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}

const PAIRS = [
    ['lim n→∞ ((5n+7)/(5n-8))^n', '\\lim_{n\\to \\infty}\\left(\\frac{5n+7}{5n-8}\\right)^{n}'],
    ['lim x→-∞ x/sqrt(3x^2+5)', '\\lim_{x\\to -\\infty}\\frac{x}{\\sqrt{3x^{2}+5}}'],
    // suma w granicy zostaje w nawiasie (inaczej czyta się jak (lim A) − B)
    ['lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2))', '\\lim_{n\\to \\infty}\\left(\\sqrt[3]{n^{3}+8n^{2}}-\\sqrt[3]{n^{3}+2n^{2}}\\right)'],
    ['lim x→0+ sin x/x', '\\lim_{x\\to 0^{+}}\\frac{\\sin x}{x}'],
    ['lim n→∞ (log_2(8n+1)-log_2(n+6))', '\\lim_{n\\to \\infty}\\left(\\log_{2}\\left(8n+1\\right)-\\log_{2}\\left(n+6\\right)\\right)'],
    // rysunek pokazuje, co parser liczy: 1/2n = (1/2)·n
    ['1/2n', '\\frac{1}{2}n'],
    ['2,5/x', '\\frac{2{,}5}{x}'],
    ['-x^2', '-x^{2}'], ['(-x)^2', '\\left(-x\\right)^{2}'],
    ['sin^2(x)+cos(x)^2', '\\sin^{2} x+\\cos^{2} x'],
    ['pochodna x^2*sin x', '\\left(x^{2}\\cdot \\sin x\\right)^{\\prime}'],
    ['całka od 0 do 1 x^2 dx', '\\int_{0}^{1} x^{2}\\,dx'],
];
for (const [q, want] of PAIRS) { const t = exprToLatex(q); ok(q, t === want, t); }
// bez rysunku: prosta arytmetyka, pieniądze, tekst, puste
for (const q of ['2+2', '3*4-1', '100 zł + 23% vat', 'ile dni do 1.09', '', '   '])
    ok('bez rysunku: ' + JSON.stringify(q), exprToLatex(q) === null, exprToLatex(q));

// ── zestaw: zapis → rysunek → odczyt = to samo zadanie ──
const split = s => { const m = /^lim\s*([a-z])\s*→\s*(\S+?)\s+(.*)$/.exec(s); return m && { v: m[1], at: m[2], body: m[3] }; };
const val = (body, v, x) => { try { return C.evalExpr(C.fromAst(S._core.parse(body)), { [v]: x }); } catch { return NaN; } };
const pts = at => at === '∞' ? [1.3, 2.3, 3.7, 5.1, 7.9, 12.4] : at === '-∞' ? [-1.3, -2.3, -3.7, -5.1, -7.9, -12.4]
    : [0.13, 0.37, -0.21, 0.29, -0.43, 0.61].map(d => +at + d);
const bad = [];
for (const z of ZESTAW) {
    const t = exprToLatex(z.input), back = t && latexToExpr(t);
    const g = split(z.input), o = back && back.expr && split(back.expr);
    let same = !!(o && o.v === g.v && o.at === g.at), cmp = 0;
    if (same) for (const x of pts(g.at)) {
        const a = val(g.body, g.v, x), b = val(o.body, o.v, x);
        if (Number.isNaN(a) && Number.isNaN(b)) continue;
        cmp++;
        if (!(a === b || Math.abs(a - b) <= 1e-9 * (1 + Math.abs(a)))) { same = false; break; }
    }
    if (!same || cmp < 3) bad.push(z.id + ': ' + t + ' → ' + (back && (back.expr || back.error)));
}
ok('zestaw: 58/58 rysunków wraca do tego samego zadania', bad.length === 0, bad);

// ── kroki jak na kartce (spec 5.12): żaden krok z zestawu i ze ściągi nie pokazuje zapisu z klawiatury ──
{
    const { stepToLatex } = require(path.join(root, 'js', 'expr-to-latex.js'));
    const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));
    require(path.join(root, 'js', 'math-limits.js'));
    const html = require('fs').readFileSync(path.join(root, 'index.html'), 'utf8');
    const decode = t => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const defs = require('fs').readFileSync(path.join(root, 'command-definitions.js'), 'utf8');
    const sciaga = [...html.matchAll(/data-command="([^"]*)"/g)].map(m => decode(m[1]))
        .concat([...defs.matchAll(/command: '((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")));
    const used = new Set(), leaks = [];
    let steps = 0;
    // znane granice i de l'Hospital — po jednym przykładzie na każdy wzór słownika
    const extra = ['lim x→0 sin(3x)/x', 'lim x→0 tan(2x)/x', 'lim x→0 arcsin(2x)/x', 'lim x→0 arctg(3x)/x', 'lim x→0 ln(1+2x)/x',
        'lim x→0 (e^x-1)/x', 'lim x→0 (x - sin(x))/x^3'];
    for (const q of ZESTAW.map(z => z.input).concat(sciaga, extra)) {
        let r; try { r = S.run(q); } catch { continue; }
        if (!r || !r.explain || !r.explain.steps) continue;
        for (const st of r.explain.steps) {
            steps++;
            const fid = st.formula && st.formula.id;
            const tex = stepToLatex(st.math, fid).join(' ');
            // słowa zostają tekstem (L, „pasuje”), ale bez zapisu z klawiatury: ułamka z „/”, potęgi z „^”, „√(”
            const words = (tex.match(/\\text\{[^}]*\}/g) || []).filter(w => /[/^²³]|\\\^|√\(|∛\(|sqrt/.test(w));
            if (words.length || /sqrt\(|\^\(|√\(|∛\(/.test(tex)) leaks.push(q + ' | ' + st.math + ' → ' + tex);
            if (/[⟦⟧]/.test(st.math) && !(fid && FORMULAS[fid] && tex.includes('\\htmlData{formula=' + fid + '}'))) leaks.push('wzór bez słownika: ' + st.math);
            if (fid) used.add(fid);
        }
    }
    console.log('  kroki sprawdzone:', steps, '(ściąga: ' + sciaga.length + ' przykładów)');
    ok('kroki: ' + steps + ' kroków (zestaw + ściąga) narysowanych bez zapisu z klawiatury', steps > 300 && leaks.length === 0, leaks.slice(0, 8));
    // każdy wzór ze słownika ma przykład, w którym krok go używa, i treść dymku
    for (const [id, f] of Object.entries(FORMULAS)) {
        ok('wzór ' + id + ': użyty w kroku', used.has(id));
        ok('wzór ' + id + ': ma treść dymku', !!(f.name && f.tex && f.why && f.level));
        ok('wzór ' + id + ': dymek bez zapisu z klawiatury', ![f.why].concat(f.more).some(t => /\^\(|sqrt\(|√\(/.test(t.replace(/\$[^$]*\$/g, ''))));
    }
    ok('kroki: 1 + (−b) z nawiasem', stepToLatex('1 + (−3/(n + 3))')[0] === '1+\\left(-\\frac{3}{n+3}\\right)', stepToLatex('1 + (−3/(n + 3))'));
    ok('kroki: f′(t), ∫ … dx, 0⁺, +∞', stepToLatex('f′(t) = 2at').join('') === 'f^{\\prime}\\left(t\\right)=2a t'
        && stepToLatex('∫ x² dx = x³/3').join('') === '\\int x^{2}\\,dx=\\frac{x^{3}}{3}'
        && stepToLatex('lim(x→0⁺) 1/x = +∞').join('') === '\\lim_{x\\to 0^{+}}\\frac{1}{x}=+\\infty ', stepToLatex('f′(t) = 2at'));
    // 15 grup [∞] w jednym kawałku to więcej niż liter zastępczych — kawałek zostaje tekstem, bez wyjątku
    let thrown = null, many = null;
    try { many = stepToLatex(Array(16).fill('∞').join(' · ')); } catch (e) { thrown = e.message; }
    ok('kroki: za dużo grup → tekst, nie wyjątek', !thrown && many && many.length === 1, thrown || many);
    ok('kroki: przecinek zostaje przy wzorze', stepToLatex('1 − 1/n = 1 + 1/(−n),  aₙ = −n').join('|') === '1-\\frac{1}{n}|=1+\\frac{1}{-n},|a_{n}|=-n');
}

console.log(fail ? '❌ ' + fail + ' błędów, ' + pass + ' ok' : '✅ expr-to-latex: ' + pass + ' ok');
process.exit(fail ? 1 : 0);
