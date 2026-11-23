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

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const defs = fs.readFileSync(path.join(root, 'command-definitions.js'), 'utf8');
const decode = (/** @type {string} */ t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// przykłady z testów kroków (dopisuj tu nowe zadania, które mają kroki)
const EXTRA = ['lim x→0 sin(3x)/x', 'lim x→0 tan(2x)/x', 'lim x→0 arcsin(2x)/x', 'lim x→0 arctg(3x)/x', 'lim x→0 ln(1+2x)/x',
    'lim x→0 (e^x-1)/x', 'lim x→0 (x - sin(x))/x^3', 'lim n→∞ (1-1/n)^2', 'lim n→∞ 5(1+1/n)^n', 'lim x→0+ 1/x',
    'rozwiąż x^2 - 4x + 4 = 0', 'rozłóż x^2 - 9', 'rozwiąż x^2 - 2x - 1 = 0', 'rozwiąż x^2 = 9', 'rozwiąż 2x + 3 = 11',
    'rozwiąż 5 = 2x - 7', 'rozwiąż x/2 + 1 = 3', 'rozwiąż x^2 - 3x = 0', 'rozwiąż x^2 + 1 = 0', 'rozłóż x^3 - x', 'rozwiąż x=52+65', 'rozwiąż 2x/3 = 4', 'rozwiąż 7 = 3 - x', 'rozwiąż 2x^2 - 6x = 0', 'rozwiąż 5 - 2x ≥ 11', 'rozwiąż x^2 + 2 > 2x', 'rozwiąż x^2 - 4 < 0', 'rozwiąż x^2 - 2x - 1 < 0', 'rozwiąż 2x + 3y = 12; 3x - 2y = 5', 'rozwiąż x = 2y, x + y = 9', 'rozwiąż 2x + y = 1, x - y = 1', 'rozwiąż 3x - y = 1, -x + 2y = 3',
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
    .concat(EXTRA))];

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
fs.writeFileSync(process.argv[2] || path.join(__dirname, 'steps.json'), JSON.stringify(out));
console.log('zadań z krokami:', out.length, ' kroków:', out.reduce((a, b) => a + b.steps.length, 0));
process.exit(0);
