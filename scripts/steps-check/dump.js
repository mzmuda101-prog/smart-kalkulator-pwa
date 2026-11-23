// @ts-check
// Bramka „każde = jest prawdą” (narzędzie deweloperskie, nie część apki), część 1 z 2.
// Zrzuca każdy krok każdego przykładu jako kawałki LaTeX — dokładnie to, co rysuje ekran (stepToLatex).
// Część 2 (check.py) sprawdza je SymPy. Uruchom: npm run check:steps (README w tym folderze).
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { stepToLatex } = require(path.join(root, 'js', 'expr-to-latex.js'));
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const defs = fs.readFileSync(path.join(root, 'command-definitions.js'), 'utf8');
const decode = (/** @type {string} */ t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// przykłady z testów kroków (dopisuj tu nowe zadania, które mają kroki)
const EXTRA = ['lim x→0 sin(3x)/x', 'lim x→0 tan(2x)/x', 'lim x→0 arcsin(2x)/x', 'lim x→0 arctg(3x)/x', 'lim x→0 ln(1+2x)/x',
    'lim x→0 (e^x-1)/x', 'lim x→0 (x - sin(x))/x^3', 'lim n→∞ (1-1/n)^2', 'lim n→∞ 5(1+1/n)^n', 'lim x→0+ 1/x',
    'rozwiąż x^2 - 4x + 4 = 0', 'rozłóż x^2 - 9', 'rozwiąż x^2 - 2x - 1 = 0', 'rozwiąż x^2 = 9', 'rozwiąż 2x + 3 = 11',
    'rozwiąż 5 = 2x - 7', 'rozwiąż x/2 + 1 = 3', 'rozwiąż x^2 - 3x = 0', 'rozwiąż x^2 + 1 = 0', 'rozłóż x^3 - x', 'rozwiąż x=52+65', 'rozwiąż 2x/3 = 4', 'rozwiąż 7 = 3 - x', 'rozwiąż 2x^2 - 6x = 0', 'rozwiąż 5 - 2x ≥ 11', 'rozwiąż x^2 + 2 > 2x', 'rozwiąż x^2 - 4 < 0', 'rozwiąż x^2 - 2x - 1 < 0', 'rozwiąż 2x + 3y = 12; 3x - 2y = 5', 'rozwiąż x = 2y, x + y = 9', 'rozwiąż 2x + y = 1, x - y = 1', 'rozwiąż 3x - y = 1, -x + 2y = 3', 'rozwiąż 1/x = 2', 'rozwiąż (x+1)/(x-2) = 3', 'rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'rozwiąż x^2/(x-1) = 1/(x-1)', 'rozwiąż 2^x = 8', 'rozwiąż 3^(x+1) = 27', 'rozwiąż 4^x = 2^(x+3)', 'rozwiąż 2^x = 1/8', 'rozwiąż 9^x = 27', 'rozwiąż log_2(x) = 3', 'rozwiąż log(x) = 2', 'rozwiąż log_2(x+3) = log_2(2x)', 'rozwiąż |x-2| = 3', 'rozwiąż |2x+1| = 0', 'rozwiąż |x-2| < 3', 'rozwiąż √(x+3) = x - 3', 'rozwiąż sqrt(2x-1) = 3', 'rozwiąż sin(x) = 1/2', 'rozwiąż cos(x) = sqrt(2)/2', 'rozwiąż tg(x) = 1', 'rozwiąż sin(2x) = 1/2', 'nwd(12, 18)', 'nww(4, 6)', 'nwd(12, 18, 30)', 'wierzchołek x^2 - 4x + 3', 'wierzchołek 2x^2 + 3x - 2', 'kroki 20% z 150', 'kroki 150 + 20%', 'kroki ile procent 30 z 120',
    'kroki 3/4 - 1/6', 'kroki 5/6 + 1/4', 'kroki 3/5 : 9/10', 'kroki 2/3 * 9/4', 'kroki 2/3 + 5/6', 'kroki 6 : 2 * 3', 'pochodna x/(x+1)', 'pochodna sin(x^2)', 'pochodna (3x+1)^5', 'pochodna √x',
    'pochodna 1/x', 'pochodna 3/x^2', 'pochodna 5x^3', 'pochodna x^2*e^x', 'pochodna (x^2+1)/(x-1)', 'pochodna ln(x^2+1)',
    'pochodna √(x^2+1)', 'pochodna e^(2x)', 'pochodna x^2*sin(2x)', 'pochodna sin(x)^2', 'pochodna x^(2/3)',
    'całka 1/(x^2+4)', 'całka 1/(x^2+3)', 'całka sin(x)^2', 'całka cos(x)^2', 'całka tan(x)^2', 'całka x^2 od 0 do 1',
    'całka sin(x) od 0 do π', 'całka 1/x od 1 do e', 'całka t^2 dt od -1 do 2', 'całka 2x+1 od 1 do 3', 'całka 1/(x^2-1)',
    'całka (x+3)/(x^2-3x+2)', 'całka 1/(x^2+x)', 'całka x^3/(x^2-1)', 'całka x*ln(x)', 'całka x*sin(x)', 'całka x^2*e^x',
    'całka (2x+1)^3', 'całka x*e^(x^2)', 'całka √x', 'całka 1/x^2', 'całka 3/x^3', 'całka 2x*cos(x^2)'];
const queries = [...new Set(require(path.join(root, 'test', 'limits-zestaw.json')).map((/** @type {{input: string}} */ z) => z.input)
    .concat([...html.matchAll(/data-command="([^"]*)"/g)].map(m => decode(m[1])))
    .concat([...defs.matchAll(/command: '((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")))
    .concat(EXTRA)
    .concat(Object.values(FORMULAS).map(f => f.try).filter(Boolean)))]; // przykłady „Spróbuj” z podręcznika

const out = [];
for (const q of queries) {
    let r; try { r = S.run(q); } catch { continue; }
    if (!r || !r.explain || !r.explain.steps) continue;
    for (const m of r.explain.methods || [r.explain]) out.push({ // każdy sposób jak osobne zadanie
        q: q + (m.label ? ' [' + m.label + ']' : ''), title: r.explain.title,
        steps: m.steps.map((/** @type {{label: string, math: string}} */ s) => ({
            label: s.label, math: s.math,
            // linia kroku = lista kawałków; '\n' w stepToLatex dzieli linie
            lines: stepToLatex(s.math, 'f').join('\u0000').split('\u0000\n\u0000').map(l => l.split('\u0000')),
        })),
    });
}

// Hasła podręcznika: każda równość $… = …$ z tekstów (why, more) jako osobne zadanie.
// Pomijamy warunki i definicje: strzałki, nierówności, słowa, „Δ = 0” (różne litery po stronach znaku =).
/** @type {Record<string, string>} fragment → dlaczego SymPy go nie sprawdza */
const SKIP_PROSE = {
    '(a-b)(a+b)=a\\cdot a+a\\cdot b-b\\cdot a-b\\cdot b': 'tożsamość z literami a, b; parser nie czyta; sprawdzone ręcznie w SymPy',
    'x^{2}+\\frac{b}{a}x=\\left(x+\\frac{b}{2a}\\right)^{2}-\\frac{b^{2}}{4a^{2}}': 'tożsamość z literami a, b; parser nie czyta; sprawdzone ręcznie w SymPy',
    '\\left(1-\\frac{1}{n}\\right)^{n}=\\left[\\left(1+\\frac{1}{-n}\\right)^{-n}\\right]^{-1}': 'tożsamość potęg; sprawdzone ręcznie w SymPy',
    '\\left|x\\right|=-x': 'warunek: tylko dla x < 0 (zdanie mówi „gdy x jest ujemne”); sprawdzone ręcznie',
    '(n+3)^{2g}=\\left((n+3)^{2}\\right)^{g}': 'potęga potęgi; parser nie czyta tego zapisu; sprawdzone ręcznie w SymPy',
    '\\frac{\\ln(1+u)}{u}=\\ln\\left(1+u\\right)^{\\frac{1}{u}}': 'logarytm potęgi; sprawdzone ręcznie w SymPy (u > 0)',
    '\\left(5x^{2}\\right)^{\\prime}=5\\cdot 2x=10x': 'pochodna z prim; parser nie czyta; sprawdzone ręcznie w SymPy',
    '(u+\\Delta u)(v+\\Delta v)-uv=v\\,\\Delta u+u\\,\\Delta v+\\Delta u\\,\\Delta v': 'przyrosty Δu, Δv; parser nie czyta; sprawdzone ręcznie w SymPy',
    '\\left(\\sin\\left(x^{2}\\right)\\right)^{\\prime}=\\cos\\left(x^{2}\\right)\\cdot 2x': 'pochodna z prim; parser nie czyta; sprawdzone ręcznie w SymPy',
    '\\left(a^{x}\\right)^{\\prime}=a^{x}\\ln a': 'pochodna z prim; parser nie czyta; sprawdzone ręcznie w SymPy',
    '\\int uv^{\\prime}\\,dx=uv-\\int u^{\\prime}v\\,dx': 'całki z funkcjami u, v; równoważne pochodnej iloczynu; sprawdzone ręcznie w SymPy',
    'x+1=3(x-2)': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    'x+1=3x-6': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    '4^{x}=2^{x+3}': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    '2^{2x}=2^{x+3}': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    '2x=x+3': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    '\\sqrt{x+3}=x-3': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    'x+3=x^{2}-6x+9': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    'x+3=(x-3)^{2}': 'równanie do rozwiązania (warunek), nie tożsamość; rozwiązanie sprawdza try/expect',
    '\\Delta=0': 'warunek (przypadek delty), nie rachunek',
    '2\\log_{4}(4n+5)=\\log_{4}(4n+5)^{2}': 'parser nie czyta log z potęgą argumentu; prawda: 2·log_a b = log_a b²',
    'x=x^{1}': 'zapis x jako potęgi, check.py traktuje „x = …” jak wstawienie',
    '(uv)^{\\prime}=u^{\\prime}v+uv^{\\prime}': 'wzór na pochodną iloczynu z funkcjami u, v, nie do policzenia; sprawdzony w krokach pochodnych',
};
const letters = (/** @type {string} */ t) => [...new Set(t.replace(/\\[a-zA-Z]+/g, ' ').match(/[a-zA-Z]/g) || [])].sort().join('');
/** @param {string} t */
function splitTop(t) { // podział po „=” poza nawiasami {}
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of t) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (ch === '=' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    return parts.concat(cur);
}
let proseSkipped = 0;
for (const [id, f] of Object.entries(FORMULAS)) {
    for (const text of [f.why].concat(f.more || [])) {
        for (const m of text.matchAll(/\$([^$]+)\$/g)) {
            const frag = m[1];
            const parts = splitTop(frag).map(p => p.trim());
            if (parts.length < 2 || parts.some(p => !p)) continue;
            if (SKIP_PROSE[frag] || /\\to(?![a-z])|\\approx|\\text|\\quad|\\le(?![a-z])|\\ge(?![a-z])|\\neq|\\pm|[<>]|\\infty/.test(frag)
                || new Set(parts.map(letters)).size > 1) { proseSkipped++; continue; }
            out.push({ q: 'hasło ' + id, title: 'Hasło', steps: [{ label: 'tekst', math: frag, lines: [[parts[0]].concat(parts.slice(1).map(p => '=' + p))] }] });
        }
    }
}
console.log('hasła: pominięte warunki i definicje:', proseSkipped);
fs.writeFileSync(process.argv[2] || path.join(__dirname, 'steps.json'), JSON.stringify(out));
console.log('zadań z krokami:', out.length, ' kroków:', out.reduce((a, b) => a + b.steps.length, 0));
process.exit(0);
