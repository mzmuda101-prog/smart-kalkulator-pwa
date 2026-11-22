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
    ['pochodna x^3*sin(x)', 'f′(x) = 3x² · sin(x) + x³ · cos(x)'],
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
    ['całka x*sin(x)', 'sin(x) − x · cos(x) + C'], // bez minusa na początku (3f)
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
ok('iloczyn', labels('pochodna x^3*sin(x)').includes('Rozpoznaję iloczyn'));
ok('iloraz', labels('pochodna x/(x^2+1)').includes('Rozpoznaję iloraz'));
ok('złożona', labels('pochodna sin(2x)').includes('Liczę pochodną złożoną'));
ok('podstawienie', labels('całka x/(x^2+1)').includes('Podstawienie: t = x² + 1'));
ok('przez części', labels('całka x*e^x').includes('Całkuję przez części'));
ok('ułamki proste', labels('całka 1/(x^2-1)').includes('ułamki proste'));
ok('sprawdzenie', labels('całka x^2').includes('Sprawdzenie'));
ok('Newton-Leibniz', labels('całka x^2 od 0 do 1').includes('Liczę F(b) − F(a)'));
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

// ── 3e-2: pochodne i całki zrozumiale (plan kroków) ──
{
    const st = q => S.run(q).explain.steps;
    const has = (q, label, math) => st(q).some(x => x.label === label && (math == null || x.math === math));
    const fm = (q, id) => st(q).some(x => x.formula && x.formula.id === id && /⟦.+⟧/.test(x.math));
    const show = q => st(q).map(x => x.label + ': ' + x.math);
    const P = 'pochodna x^3 * sin(x)';
    ok('3e2: iloczyn — u i v w jednej linii', has(P, 'Rozpoznaję iloczyn', 'u = x³,  v = sin(x)'), show(P));
    ok('3e2: iloczyn — wstawiam do wzoru w kolejności wzoru', has(P, 'Wstawiam do wzoru', 'u′ = 3x²,  v′ = cos(x)\nu′ · v + u · v′ = ⟦3x² · sin(x) + x³ · cos(x)⟧') && fm(P, 'pochodna-iloczynu'), show(P));
    ok('3e2: pochodna potęgi z dymkiem', has(P, 'Liczę pochodną potęgi', 'u′ = ⟦(x³)′⟧ = 3x²') && fm(P, 'pochodna-potegi'), show(P));
    ok('3e2: tablica pochodnych z dymkiem', has(P, 'Korzystam z tablicy pochodnych', 'v′ = ⟦(sin(x))′⟧ = cos(x)') && fm(P, 'tablica-pochodnych'), show(P));
    const Q = 'pochodna x/(x+1)';
    ok('3e2: iloraz — wstawiam do wzoru', st(Q).some(x => x.label === 'Wstawiam do wzoru' && x.math.includes('(u′ · v − u · v′)/v² = ⟦(1 · (x + 1) − x · 1)/(x + 1)²⟧')) && fm(Q, 'pochodna-ilorazu'), show(Q));
    ok('3e2: złożona z dymkiem', has('pochodna sin(x^2)', 'Liczę pochodną złożoną', '(sin(x²))′ = ⟦cos(x²) · (x²)′⟧') && fm('pochodna sin(x^2)', 'pochodna-zlozona'), show('pochodna sin(x^2)'));
    ok('3e2: stała przy samej zmiennej a · t²', has('pochodna a * t^2 po t', 'Stała zostaje przed pochodną'), show('pochodna a * t^2 po t'));
    ok('3e2: całka potęgi z dymkiem', has('całka x^2', 'Całkuję potęgę', '⟦∫ x² dx⟧ = x³/3') && fm('całka x^2', 'calka-potegi'), show('całka x^2'));
    ok('3e2: tablica całek z dymkiem', fm('całka 1/x', 'tablica-calek') && fm('całka e^x', 'tablica-calek'), show('całka 1/x'));
    ok('3e2: przez części z dymkiem', fm('całka x * e^x', 'przez-czesci'), show('całka x * e^x'));
    ok('3e2: całka oznaczona — granice w kroku 1', st('całka x^2 od 0 do 1')[0].math === '∫(0→1) x² dx', show('całka x^2 od 0 do 1'));
    ok('3e2: Newton-Leibniz z dymkiem', fm('całka x^2 od 0 do 1', 'newton-leibniz'), show('całka x^2 od 0 do 1'));
    ok('3e2: tożsamość sin² z dymkiem', fm('całka sin(x)^2', 'sin-kwadrat'), show('całka sin(x)^2'));
    // uwagi „słabego ucznia” (3e-2)
    ok('3e2: wyłączona stała wraca na końcu (2 · sin(x²)/2)', has('całka 2x*cos(x^2)', 'Mnożę przez wyłączoną stałą', '2 · sin(x²)/2 = sin(x²)'), show('całka 2x*cos(x^2)'));
    ok('3e2: a = 2 przy arctg', st('całka 1/(x^2+4)').some(x => x.formula && x.formula.id === 'calka-arctg' && x.math.startsWith('4 = 2²,  a = 2')), show('całka 1/(x^2+4)'));
    ok('3e2: tożsamość sin² widać', st('całka sin(x)^2').some(x => x.formula && x.formula.id === 'sin-kwadrat' && x.math.startsWith('sin²(x) = ⟦(1 − cos(2x))/2⟧')), show('całka sin(x)^2'));
    ok('3e2: całka sumy w nawiasie', st('całka 3x^2 + 2')[0].math === '∫ (3x² + 2) dx', show('całka 3x^2 + 2'));
    ok('3e2: stała bez podkreślenia potęgi', !st('pochodna 3x^2 + 2x - 5').some(x => /⟦\(−5\)′⟧/.test(x.math)), show('pochodna 3x^2 + 2x - 5'));
    ok('3e2: π w granicach całki', st('całka sin(x) od 0 do pi')[0].math === '∫(0→π) sin(x) dx', show('całka sin(x) od 0 do pi'));
    // żadna etykieta pochodnych i całek nie zawiera wzoru (poza „Podstawienie: t = …”, „Wracam do zmiennej”)
    const bad = [P, Q, 'pochodna sin(x^2)', 'pochodna (3x+1)^5', 'pochodna 3x^2 + 2x - 5', 'całka x * e^x', 'całka x^2 od 0 do 1', 'całka 1/(x^2+4)',
        'całka sin(x)^2', 'całka 1/x', 'całka e^x', 'całka tan(x)', 'całka 5'].flatMap(q => st(q).map(x => x.label)).filter(l => /[=′∫]|ⁿ/.test(l) && !/^Podstawienie|^Liczę F\(b\)/.test(l));
    // 3g: pochodne bez skoków (raport C): u i v, √x jako potęga, ostatnie mnożenie, licznik ilorazu krok po kroku
    ok('3g: √x zapisane jako potęga', has('pochodna √x', 'Liczę pochodną potęgi', '√x = x^(1/2)\n⟦(x^(1/2))′⟧ = 1/2 · x^(−1/2) = 1/(2√x)'), show('pochodna √x'));
    ok('3g: 1/x zapisane jako potęga', has('pochodna 1/x', 'Liczę pochodną potęgi', '1/x = x^(−1)\n⟦(x^(−1))′⟧ = −1 · x^(−2) = −1/x²'), show('pochodna 1/x'));
    ok('3g: x³ bez zbędnej linii', has('pochodna x^3', 'Liczę pochodną potęgi', '⟦(x³)′⟧ = 3x²'), show('pochodna x^3'));
    ok('3g: złożona — mnożę przez pochodną środka (5 · 3)', has('pochodna (3x+1)^5', 'Mnożę przez pochodną środka', '5(3x + 1)⁴ · 3 = 15(3x + 1)⁴'), show('pochodna (3x+1)^5'));
    ok('3g: złożona — sin(x²)', has('pochodna sin(x^2)', 'Mnożę przez pochodną środka', 'cos(x²) · 2x'), show('pochodna sin(x^2)'));
    ok('3g: tablica (środek = x) bez mnożenia', !has('pochodna sin(x)', 'Mnożę przez pochodną środka'), show('pochodna sin(x)'));
    ok('3g: stała — ostatnie mnożenie 5 · 3x²', has('pochodna 5x^3', 'Mnożę przez stałą', '5 · 3x² = 15x²'), show('pochodna 5x^3'));
    ok('3g: stała — a · 2t', has('pochodna a * t^2 po t', 'Mnożę przez stałą', 'a · 2t = 2at'), show('pochodna a * t^2 po t'));
    ok('3g: iloraz — licznik wymnożony przed uproszczeniem', st('pochodna (x^2+1)/(x-1)').some(x => x.label === 'Wstawiam do wzoru' && x.math.includes(' = (2x² − 2x − x² − 1)/(x − 1)² = (x² − 2x − 1)/(x − 1)²')), show('pochodna (x^2+1)/(x-1)'));
    ok('3g: iloraz — x/(x+1) z wymnożonym licznikiem', st(Q).some(x => x.label === 'Wstawiam do wzoru' && x.math.endsWith(' = (x + 1 − x)/(x + 1)² = 1/(x + 1)²')), show(Q));
    ok('3g: całka √x przez x^(1/2)', has('całka √x', 'Całkuję potęgę', '√x = x^(1/2)\n⟦∫ x^(1/2) dx⟧ = x^(3/2)/(3/2) = 2x√x/3'), show('całka √x'));
    ok('3g: całka 1/x² przez x^(−2)', has('całka 1/x^2', 'Całkuję potęgę', '1/x² = x^(−2)\n⟦∫ x^(−2) dx⟧ = x^(−1)/(−1) = −1/x'), show('całka 1/x^2'));
    ok('3g: ujemny czynnik w nawiasie przy stałej całki', has('całka 3/x^3', 'Mnożę przez wyłączoną stałą', '3 · (−1/(2x²)) = −3/(2x²)'), show('całka 3/x^3'));
    ok('3g: tożsamość — kolor na tym, co wstawiamy', st('całka sin(x)^2').some(x => x.math.startsWith('sin²(x) = ⟦(1 − cos(2x))/2⟧')), show('całka sin(x)^2'));
    ok('3e2: etykiety bez wzorów', bad.length === 0, [...new Set(bad)]);
}

console.log(`math-calculus: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
