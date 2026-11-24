// @ts-check
// Lista zadań, które mają kroki: zestaw granic, ściągi, EXTRA i „Spróbuj” z podręcznika.
// Wspólna dla dump.js (bramka SymPy) i steps-dump-student.js (przegląd „słabego ucznia”).
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const defs = fs.readFileSync(path.join(root, 'command-definitions.js'), 'utf8');
const decode = (/** @type {string} */ t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// przykłady z testów kroków (dopisuj tu nowe zadania, które mają kroki)
const EXTRA = ['lim x→0 sin(3x)/x', 'lim x→0 tan(2x)/x', 'lim x→0 arcsin(2x)/x', 'lim x→0 arctg(3x)/x', 'lim x→0 ln(1+2x)/x',
    'lim x→0 (e^x-1)/x', 'lim x→0 (x - sin(x))/x^3', 'lim n→∞ (1-1/n)^2', 'lim n→∞ 5(1+1/n)^n', 'lim x→0+ 1/x', 'lim x→2 (3x-6)/(x^2-4)', 'lim x→3 (2x-6)/(x^2-9)', 'lim x→3 (x^2-9)/(2x-6)', 'lim x→0.5 (2x^2+x-1)/(4x^2-1)', 'lim x→1 (x^5-1)/(x-1)', 'lim x→1 (3x^2-3)/(2x-2)',
    'rozwiąż x^2 - 4x + 4 = 0', 'rozłóż x^2 - 9', 'rozwiąż x^2 - 2x - 1 = 0', 'rozwiąż x^2 = 9', 'rozwiąż 2x + 3 = 11',
    'rozwiąż 5 = 2x - 7', 'rozwiąż x/2 + 1 = 3', 'rozwiąż x^2 - 3x = 0', 'rozwiąż x^2 + 1 = 0', 'rozłóż x^3 - x', 'rozłóż x^2 - 6x + 9', 'rozłóż 4x^2 - 9', 'rozłóż x^3 - 8', 'rozłóż x^3 + 8', 'rozłóż 2x^2 - 3x + 1', 'rozłóż x^3 - 2x^2 + x - 2', 'rozłóż x^4 - 13x^2 + 36', 'rozłóż x^3 - 6x^2 + 11x - 6', 'rozłóż x^4 + 5x^2 + 4', 'rozłóż 84', 'rozłóż x^3 - 3x^2 - x + 3', 'rozłóż 2x^3 + x^2 + 2x + 1', 'rozłóż x^3 + x^2 - x - 1', 'rozłóż x^3 - 3x + 2', 'rozłóż 0.5x^2 - 2', 'uprość (4x^2-1)/(2x-1)', 'uprość (2x^2-x-1)/(x-1)', 'uprość (x-1)/(2x^2-x-1)', 'uprość (x^2-0.25)/(x-0.5)', 'rozwiąż x^3 - x = 0', 'rozwiąż x^4 + x^2 - 6 = 0', 'rozwiąż x^4 - 5x^2 + 4 = 0', 'rozwiąż x^3 - 6x^2 + 11x - 6 = 0', 'rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0', 'rozwiąż x=52+65', 'rozwiąż 2x/3 = 4', 'rozwiąż 7 = 3 - x', 'rozwiąż 2x^2 - 6x = 0', 'rozwiąż 5 - 2x ≥ 11', 'rozwiąż x^2 + 2 > 2x', 'rozwiąż x^2 - 4 < 0', 'rozwiąż x^2 - 2x - 1 < 0', 'rozwiąż 2x + 3y = 12; 3x - 2y = 5', 'rozwiąż x = 2y, x + y = 9', 'rozwiąż 2x + y = 1, x - y = 1', 'rozwiąż 3x - y = 1, -x + 2y = 3', 'rozwiąż 1/x = 2', 'rozwiąż (x+1)/(x-2) = 3', 'rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'rozwiąż x^2/(x-1) = 1/(x-1)', 'rozwiąż 2^x = 8', 'rozwiąż 3^(x+1) = 27', 'rozwiąż 4^x = 2^(x+3)', 'rozwiąż 2^x = 1/8', 'rozwiąż 9^x = 27', 'rozwiąż log_2(x) = 3', 'rozwiąż log(x) = 2', 'rozwiąż log_2(x+3) = log_2(2x)', 'rozwiąż |x-2| = 3', 'rozwiąż |2x+1| = 0', 'rozwiąż |x-2| < 3', 'rozwiąż √(x+3) = x - 3', 'rozwiąż sqrt(2x-1) = 3', 'rozwiąż sin(x) = 1/2', 'rozwiąż cos(x) = sqrt(2)/2', 'rozwiąż tg(x) = 1', 'rozwiąż sin(2x) = 1/2', 'nwd(12, 18)', 'nww(4, 6)', 'nwd(12, 18, 30)', 'wierzchołek x^2 - 4x + 3', 'wierzchołek 2x^2 + 3x - 2', 'kroki 20% z 150', 'kroki 150 + 20%', 'kroki ile procent 30 z 120',
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

module.exports = queries;
