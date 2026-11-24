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
const queries = require('./queries.js');


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
