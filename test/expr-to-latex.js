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
    const leaks = [];
    let steps = 0;
    // znane granice i de l'Hospital — po jednym przykładzie na każdy wzór słownika
    const extra = ['lim x→0 sin(3x)/x', 'lim x→0 tan(2x)/x', 'lim x→0 arcsin(2x)/x', 'lim x→0 arctg(3x)/x', 'lim x→0 ln(1+2x)/x',
        'lim x→0 (e^x-1)/x', 'lim x→0 (x - sin(x))/x^3', 'rozwiąż x^2 - 4x + 4 = 0', 'rozłóż x^2 - 9', 'rozwiąż x^2 - 2x - 1 = 0',
        'rozwiąż x^2 = 9', 'kroki 3/4 - 1/6', 'pochodna x/(x+1)', 'pochodna sin(x^2)', 'całka 1/(x^2+4)', 'całka sin(x)^2',
        'całka cos(x)^2', 'całka tan(x)^2', 'całka x^2 od 0 do 1', 'rozwiąż 5 - 2x ≥ 11', 'rozwiąż x^2 + 2 > 2x', 'rozwiąż x^2 + 1 < 0', 'rozwiąż x^2 - 4x + 4 > 0', 'rozwiąż x^2 - 2x - 1 < 0', 'rozwiąż 2x + 3y = 12; 3x - 2y = 5', 'rozwiąż x = 2y, x + y = 9', 'rozwiąż x + y = 1, x + y = 2', 'rozwiąż x + y = 1, 2x + 2y = 2', 'rozwiąż 2x + y = 1, x - y = 1', 'rozwiąż 1/x = 2', 'rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'rozwiąż x^2/(x-1) = 1/(x-1)', 'rozwiąż 2^x = 1/8', 'rozwiąż 9^x = 27', 'rozwiąż 2^x = 5', 'rozwiąż log(x) = 2', 'rozwiąż log_2(x+3) = log_2(2x)', 'rozwiąż |x-2| = 3', 'rozwiąż |x-2| >= 3', 'rozwiąż |x| > 0', 'rozwiąż √(x+3) = x - 3', 'rozwiąż √x = -2', 'rozwiąż sin(x) = 1/2', 'rozwiąż cos(x) = -1/2', 'rozwiąż tg(x) = sqrt(3)', 'rozwiąż sin(x) = 2', 'rozwiąż sin(2x) = 1/2', 'nwd(12, 18)', 'nww(8, 15)', 'wierzchołek x^2 - 4x + 3', 'wierzchołek 2x^2 + 3x - 2', 'wierzchołek y = -x^2 + 2x', 'kroki 20% z 150', 'kroki 150 + 20%', 'kroki ile procent 30 z 120', 'kroki 12,5% z 80', 'rozłóż x^2 - 6x + 9', 'rozłóż 4x^2 - 9', 'rozłóż x^3 - 8', 'rozłóż x^3 + 8', 'rozłóż 2x^2 - 3x + 1', 'rozłóż x^3 - 2x^2 + x - 2', 'rozłóż x^4 - 13x^2 + 36', 'rozłóż x^3 - 6x^2 + 11x - 6', 'rozłóż x^4 + 5x^2 + 4', 'rozłóż 84'];
    for (const q of ZESTAW.map(z => z.input).concat(sciaga, extra)) {
        let r; try { r = S.run(q); } catch { continue; }
        if (!r || !r.explain || !r.explain.steps) continue;
        for (const st of (r.explain.methods || [r.explain]).flatMap(m => m.steps)) { // każdy sposób
            steps++;
            const fid = st.formula && st.formula.id;
            const tex = stepToLatex(st.math, fid).join(' ');
            // słowa zostają tekstem (L, „pasuje”), ale bez zapisu z klawiatury: ułamka z „/”, potęgi z „^”, „√(”
            const words = (tex.match(/\\text\{[^}]*\}/g) || []).filter(w => /[/^²³]|\\\^|√\(|∛\(|sqrt/.test(w));
            if (words.length || /sqrt\(|\^\(|√\(|∛\(/.test(tex)) leaks.push(q + ' | ' + st.math + ' → ' + tex);
            if (/[⟦⟧]/.test(st.math) && !(fid && FORMULAS[fid] && tex.includes('\\htmlData{formula=' + fid + '}'))) leaks.push('wzór bez słownika: ' + st.math);
        }
    }
    console.log('  kroki sprawdzone:', steps, '(ściąga: ' + sciaga.length + ' przykładów)');
    ok('kroki: ' + steps + ' kroków (zestaw + ściąga) narysowanych bez zapisu z klawiatury', steps > 300 && leaks.length === 0, leaks.slice(0, 8));
    // każdy wzór ze słownika ma treść dymku; hasło może istnieć tylko w podręczniku (krok bez wpisu łapie „wzór bez słownika”)
    for (const [id, f] of Object.entries(FORMULAS)) {
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
    ok('kroki: druga linia kroku zaczyna się znacznikiem', JSON.stringify(stepToLatex('x₁ = 2\nx₂ = 3')) === JSON.stringify(['x_{1}', '=2', '\n', 'x_{2}', '=3']), stepToLatex('x₁ = 2\nx₂ = 3'));
    ok('kroki: (sin(x))′ z nawiasem, nie sin′ x', stepToLatex('(sin(x))′ = cos(x)')[0] === '\\left(\\sin x\\right)^{\\prime}', stepToLatex('(sin(x))′ = cos(x)'));
    ok('kroki: całka z granicami', stepToLatex('∫(0→1) x² dx').join('') === '\\int_{0}^{1} x^{2}\\,dx', stepToLatex('∫(0→1) x² dx'));
    ok('kroki: W(1) to zapis funkcji, nie iloczyn', stepToLatex('W(1) = 0').join('') === 'W\\left(1\\right)=0', stepToLatex('W(1) = 0'));
    // [EN] licznik minus mianownik: nawias pierwszej sumy zostaje (słaby uczeń widzi, co od czego odejmujemy)
    ok('kroki: (n + 4) − n z nawiasem', stepToLatex('(n + 4) − n = 4')[0] === '\\left(n+4\\right)-n', stepToLatex('(n + 4) − n = 4'));
    ok('kroki: (5n + 7) − (5n − 8) z nawiasami', stepToLatex('(5n + 7) − (5n − 8) = 15')[0] === '\\left(5n+7\\right)-\\left(5n-8\\right)', stepToLatex('(5n + 7) − (5n − 8) = 15'));
    ok('kroki: przecinek zostaje przy wzorze', stepToLatex('1 − 1/n = 1 + 1/(−n),  aₙ = −n').join('|') === '1-\\frac{1}{n}|=1+\\frac{1}{-n},|a_{n}|=-n');
}

console.log(fail ? '❌ ' + fail + ' błędów, ' + pass + ' ok' : '✅ expr-to-latex: ' + pass + ' ok');
process.exit(fail ? 1 : 0);
