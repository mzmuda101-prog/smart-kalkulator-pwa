// Pochodne i całki krok po kroku (js/math-calculus.js).
// Uruchom: node test/math-calculus.js
'use strict';
const path = require('path');
const fc = require('fast-check');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));
require(path.join(__dirname, '..', 'js', 'math-calculus.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
const text = q => { const r = S.run(q); return r && r.text; };
const labels = q => S.run(q).explain.steps.map(s => s.label).join(' | ');
const NOPE = 'Jeszcze tego nie rozwiążę';

[
    ['pochodna x^3', 'f′(x) = 3x²'],
    ['pochodna 3x^2-2x+7', 'f′(x) = 6x − 2'],
    ['pochodna x^3*sin(x)', 'f′(x) = x³ · cos(x) + 3x² · sin(x)'],
    ['pochodna sin(2x)', 'f′(x) = 2 · cos(2x)'],
    ['pochodna e^(x^2)', 'f′(x) = 2x · e^(x²)'],
    ['pochodna ln(x)', 'f′(x) = 1/x'],
    ['pochodna sqrt(x)', 'f′(x) = 1/(2√x)'],
    ['pochodna 1/x', 'f′(x) = −1/x²'],
    ['pochodna (x^2+1)^3', 'f′(x) = 6x(x² + 1)²'],
    ['pochodna tg(x)', 'f′(x) = 1/cos²(x)'],
    ['pochodna 2^x', 'f′(x) = 2^x · ln(2)'],
    ['pochodna a*x^2 po x', 'f′(x) = 2ax'],
    ['pochodna a * t^2 po t', 'f′(t) = 2at'],
    ['d/dx x^2', 'f′(x) = 2x'],
    ["(x^2)'", 'f′(x) = 2x'],
    ['derivative of cos(x)', 'f′(x) = −sin(x)'],
    ['pochodna funkcji z x^2', 'f′(x) = 2x'],
    ['pochodna arctg(x)', 'f′(x) = 1/(x² + 1)'],
    ['całka x^2', 'x³/3 + C'],
    ['całka z x^2 dx', 'x³/3 + C'],
    ['∫ cos(x) dx', 'sin(x) + C'],
    ['całka 1/x', 'ln|x| + C'],
    ['całka x*e^x', 'x · e^x − e^x + C'],
    ['całka x^2*e^x', 'x² · e^x − 2x · e^x + 2 · e^x + C'],
    ['całka x*sin(x)', '−x · cos(x) + sin(x) + C'],
    ['całka ln(x)', 'x · ln(x) − x + C'],
    ['całka 1/(x^2+1)', 'arctg(x) + C'],
    ['całka x/(x^2+1)', 'ln|x² + 1|/2 + C'],
    ['całka sin(2x)', '−cos(2x)/2 + C'],
    ['całka e^(3x)', 'e^(3x)/3 + C'],
    ['całka tg(x)', '−ln|cos(x)| + C'],
    ['całka ln(x)/x', 'ln²(x)/2 + C'],
    ['całka x*sqrt(x^2+1)', '(x² + 1)^(3/2)/3 + C'],
    ['całka (x^2+1)/x', 'x²/2 + ln|x| + C'],
    ['całka 3x^2+2x+1', 'x³ + x² + x + C'],
    ['całka 2t dt', 't² + C'],
    ['integral of x', 'x²/2 + C'],
    ['całka x^2 od 0 do 1', '1/3'],
    ['całka od 0 do 1 x^2 dx', '1/3'],
    ['integral x from 0 to 2', '2'],
    ['całka od 0 do pi sin(x)', '2'],
    ['całka e^x od 0 do 1', '≈ 1,71828'],
].forEach(([q, want]) => ok(q, text(q) === want, text(q)));

// mają wynik (forma może być różna, wynik sprawdza moduł)
['całka 1/(x^2-1)', 'całka (2x+1)/(x^2+x+1)', 'całka x^3/(x^2+1)', 'całka 1/(x^2+2x+5)', 'całka arctg(x)',
    'całka sqrt(1-x^2)', 'całka 1/sqrt(x^2+1)', 'całka sin(x)^2', 'całka cos²x', 'całka sin(x)*cos(x)', 'całka 1/(x^2+2x+1)',
    'pochodna x/(x^2+1)', 'pochodna ln(sin(x))', 'pochodna sin²x', 'pochodna cos(x^2)*e^x']
    .forEach(q => ok('ma wynik: ' + q, !!text(q) && text(q) !== NOPE && !!S.run(q).explain, text(q)));

// uczciwość: czego nie umiemy, tego nie zgadujemy
['całka e^(x^2)', 'całka 1/(x^3+1)', 'całka e^x*sin(x)', 'pochodna x^x', 'całka 1/x od -1 do 1', 'całka 1/x od -1 do 2']
    .forEach(q => ok('nie zgaduje: ' + q, text(q) === NOPE, text(q)));
// niedopisane i cudze
['pochodna', 'całka', 'pochodna (x', 'całka x +'].forEach(q => ok('niedopisane: ' + q, S.run(q) === null, S.run(q)));
['2+2', 'pensja 7000', 'dziś + 90 dni', 'całkowity koszt'].forEach(q => ok('nie przejmuje: ' + q, S.run(q) === null, S.run(q)));
// funkcja to nie iloczyn liter
['uprość sin(x)+1', 'rozwiąż sin(x)=1', 'uprość 2pi', 'uprość ln(x)'].forEach(q => ok('funkcja: ' + q, text(q) === NOPE, text(q)));

// kroki
ok('iloczyn', labels('pochodna x^3*sin(x)').includes('Pochodna iloczynu'));
ok('iloraz', labels('pochodna x/(x^2+1)').includes('Pochodna ilorazu'));
ok('złożona', labels('pochodna sin(2x)').includes('Pochodna złożona'));
ok('podstawienie', labels('całka x/(x^2+1)').includes('Podstawienie: t = x² + 1'));
ok('przez części', labels('całka x*e^x').includes('przez części'));
ok('ułamki proste', labels('całka 1/(x^2-1)').includes('ułamki proste'));
ok('sprawdzenie', labels('całka x^2').includes('Sprawdzenie'));
ok('Newton-Leibniz', labels('całka x^2 od 0 do 1').includes('Newtona-Leibniza'));
ok('wynik oznaczony', S.run('całka x^2 od 0 do 3').value === 9, S.run('całka x^2 od 0 do 3').value);
ok('ostatni krok oznaczony', S.run('całka x^2').explain.steps.slice(-1)[0].final === true);

// losowo: całka wielomianu po zróżniczkowaniu wraca do wyjścia
const coef = fc.integer({ min: 1, max: 9 });
fc.assert(fc.property(coef, coef, coef, fc.integer({ min: 2, max: 5 }), (a, b, c, n) => {
    const f = `${a}x^${n} + ${b}x + ${c}`;
    const F = text('całka ' + f);
    if (!F || !F.endsWith(' + C')) return false;
    return text('pochodna ' + F.slice(0, -4)) === 'f′(x) = ' + text('uprość ' + f);
}), { numRuns: 300 });
// losowo: złożenia nigdy nie wywracają silnika i nie zwracają pustki
const fn = fc.constantFrom('sin', 'cos', 'tg', 'ln', 'arctg', 'sqrt');
fc.assert(fc.property(fn, fn, coef, (f, g, k) => {
    const expr = `${f}(${k}x + 1) * ${g}(x^2 + ${k})`;
    const d = S.run('pochodna ' + expr), i = S.run('całka ' + expr);
    return !!d && !!i && !!d.text && !!i.text;
}), { numRuns: 300 });
pass += 2;

console.log(`math-calculus: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
