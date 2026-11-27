// Rozwiązania krok po kroku (js/math-steps.js): przykłady + losowe zadania.
// Uruchom: node test/math-steps.js
'use strict';
const path = require('path');
const fc = require('fast-check');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
function text(q) { const r = S.run(q); return r && r.text; }
function labels(q) { return S.run(q).explain.steps.map(s => s.label).join(' | '); }

// równania
[
    ['rozwiąż 2x + 3 = 7', 'x = 2'],
    ['rozwiaz 3(x-2)=x+4', 'x = 5'],
    ['solve x^2-5x+6=0', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż x²=9', 'x₁ = −3, x₂ = 3'],
    ['rozwiąż 2x^2-8=0', 'x₁ = −2, x₂ = 2'],
    ['rozwiąż x^2-4x=0', 'x₁ = 0, x₂ = 4'],
    ['rozwiąż x^2-2x+1=0', 'x = 1'],
    ['rozwiąż x^2+x-1=0', 'x₁ = (−1 − √5)/2, x₂ = (−1 + √5)/2'],
    ['rozwiąż x^2+1=0', 'Brak rozwiązań rzeczywistych'],
    ['rozwiąż x^2+x+1=0', 'Brak rozwiązań rzeczywistych'],
    ['rozwiąż x^3-6x^2+11x-6=0', 'x₁ = 1, x₂ = 2, x₃ = 3'],
    ['rozwiąż 0,5x+1,2=3', 'x = 3,6'],
    ['rozwiąż x/2+1=3', 'x = 4'],
    ['rozwiąż 2x+3y=7', 'x = −(3/2)y + 7/2'],
    ['rozwiąż x=x', 'Każda liczba spełnia'],
    ['rozwiąż x+1=x', 'Brak rozwiązań'],
    ['rozwiąż x^2-5x+6', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż 2t-4=0', 't = 2'],
].forEach(([q, want]) => ok(q, text(q) === want, text(q)));

// uczciwość: czego nie umiemy, tego nie zgadujemy
['rozwiąż 1/x + 1/(x+1) = 1', 'rozwiąż √x + √(x+1) = 3', 'rozwiąż 2^x = x + 3', 'rozwiąż x^5+x+1000003=0', 'rozwiąż x^99=1']
    .forEach(q => ok('nie zgaduje: ' + q, text(q) === 'Jeszcze tego nie rozwiążę' && !S.run(q).explain, S.run(q)));
['rozwiąż 2x +', 'rozwiąż (x', 'rozwiąż x==2', 'kroki 2+', 'rozwiąż']
    .forEach(q => ok('niedopisane: ' + q, S.run(q) === null, S.run(q)));
['2+2', '100 zł + 23% vat', 'dziś + 90 dni', 'x', 'rozwijanie']
    .forEach(q => ok('nie przejmuje: ' + q, S.run(q) === null, S.run(q)));

// gołe równania
ok('gołe równanie', S.runBare('2x + 3 = 7').text === 'x = 2');
['x = 5', 'cena = 5', 'km = 5', '2x3=6', 'a = b = 3', '2 + 3 = 5', '1/x + 1/(x+1) = 1']
    .forEach(q => ok('gołe odrzuca: ' + q, S.runBare(q) === null, S.runBare(q)));

// upraszczanie, rozkład, rachunki
[
    ['uprość (x+1)^2+2x', 'x² + 4x + 1'],
    ['rozwiń (x+1)(x+2)', 'x² + 3x + 2'],
    ['simplify 3x+2y-x', '2x + 2y'],
    ['uprość 2x-2x', '0'],
    ['rozłóż x^2-5x+6', '(x − 2)(x − 3)'],
    ['rozłóż x^2-4', '(x − 2)(x + 2)'],
    ['rozłóż 2x^2+4x', '2x(x + 2)'],
    ['rozłóż 2x^2-8', '2(x − 2)(x + 2)'],
    ['factor x^3-1', '(x − 1)(x² + x + 1)'],
    ['rozłóż x^2+x+1', 'x² + x + 1'],
    ['rozłóż x^2+2x+1', '(x + 1)²'],
    ['kroki 1/2+1/3', '5/6'],
    ['kroki 2*(3+4)^2', '98'],
    ['kroki 2+3*4', '14'],
    ['kroki 0,1+0,2', '0,3'],
    ['1/3*0,25 krok po kroku', '1/12'],
    ['kroki sqrt(16)+1', '5'],
].forEach(([q, want]) => ok(q, text(q) === want, text(q)));

// pierwiastki liczbowe: wyciąganie kwadratów i usuwanie niewymierności z mianownika
[
    ['uprość √8', '2√2', 2 * Math.SQRT2],
    ['uprość sqrt(8)', '2√2', 2 * Math.SQRT2],
    ['uprość sqrt(12) + sqrt(27)', '5√3', 5 * Math.sqrt(3)],
    ['uprość 1/√2', '√2/2', Math.SQRT1_2],
    ['uprość 1/(√3 - 1)', '(√3 + 1)/2', 1 / (Math.sqrt(3) - 1)],
    ['uprość √(4·18)', '6√2', 6 * Math.SQRT2],
    ['uprość √7', '√7', Math.sqrt(7)],
    ['uprość 2√3 - √12', '0', 0],
    ['kroki 0,5√8', '√2', Math.SQRT2],
].forEach(([q, want, v]) => {
    const r = S.run(q);
    ok(q, r.text === want && Math.abs(r.value - v) < 1e-9 && r.explain.steps.slice(-1)[0].final, r);
});
ok('sprzężenie w krokach', labels('uprość 1/(√3 - 1)').includes('Usuwamy niewymierność z mianownika'));
ok('wymierny pierwiastek po staremu', labels('kroki sqrt(16)+1') === 'Działanie | Liczę pierwiastek | Dodaję', labels('kroki sqrt(16)+1'));

// przykłady ze ściągi dają obiecany wynik
[
    ['rozwiąż 3(x - 2) = x + 4', 'x = 5'],
    ['rozwiąż x^2 - 5x + 6 = 0', 'x₁ = 2, x₂ = 3'],
    ['rozwiąż x^3 - 6x^2 + 11x - 6 = 0', 'x₁ = 1, x₂ = 2, x₃ = 3'],
    ['uprość (x + 1)^2 + 2x', 'x² + 4x + 1'],
    ['rozłóż x^2 - 5x + 6', '(x − 2)(x − 3)'],
    ['kroki 1/2 + 1/3', '5/6'],
    ['2 * (3 + 4)^2 krok po kroku', '98'],
].forEach(([q, want]) => ok('ściąga: ' + q, text(q) === want, text(q)));

// długi dokładny wynik: na ekranik przybliżenie, pełna postać w krokach
const longRes = S.run('rozwiąż 12345x^2 - 98765x + 4321 = 0');
ok('długi wynik skrócony', longRes.text.includes('≈') && longRes.text.length < 40, longRes.text);
ok('dokładna postać w krokach', longRes.explain.steps.slice(-1)[0].math.includes('√'));

// treść kroków
ok('Δ w krokach', labels('rozwiąż x^2-5x+6=0').includes('Liczę deltę'));
ok('nawiasy w krokach', labels('rozwiąż 3(x-2)=x+4').includes('Opuszczam nawiasy'));
ok('sprawdzenie w krokach', labels('rozwiąż 2x+3=7').includes('Sprawdzenie'));
ok('wspólny mianownik', labels('kroki 1/2+1/3').includes('mianownika 6'));
ok('kolejność działań', labels('kroki 2+3*4').startsWith('Działanie | Mnożę | Dodaję'), labels('kroki 2+3*4'));
// ── 3e-1: równania i ułamki zrozumiałe (plan kroków) ──
const st = q => S.run(q).explain.steps;
const has = (q, label, math) => st(q).some(x => x.label === label && (math == null || x.math === math));
const fm = (q, id) => st(q).some(x => x.formula && x.formula.id === id && /⟦.+⟧/.test(x.math));
// przeniesienie widać osobno, potem redukcja
ok('3e: przeniesienie 3x − x = 4 + 6', has('rozwiąż 3(x - 2) = x + 4', 'Przenoszę x na lewo, liczby na prawo', '3x − x = 4 + 6'), st('rozwiąż 3(x - 2) = x + 4'));
ok('3e: redukcja 2x = 10', has('rozwiąż 3(x - 2) = x + 4', 'Redukuję wyrazy podobne', '2x = 10'));
ok('3e: tylko liczby na prawo: 2x = 11 − 3', has('rozwiąż 2x + 3 = 11', 'Przenoszę liczby na prawo', '2x = 11 − 3'), st('rozwiąż 2x + 3 = 11'));
// sprawdzenie z podstawieniem
ok('3e: sprawdzenie z podstawieniem', has('rozwiąż 3(x - 2) = x + 4', 'Sprawdzenie', 'x = 5:  L = 3(5 − 2) = 9,  P = 5 + 4 = 9 ✓'), st('rozwiąż 3(x - 2) = x + 4').slice(-2));
ok('3e: sprawdzenie bez sklejania 5 · 2', st('rozwiąż x^2 - 5x + 6 = 0').some(x => x.label === 'Sprawdzenie' && x.math.includes('L = 2² − 5 · 2 + 6 = 0')), st('rozwiąż x^2 - 5x + 6 = 0').slice(-2));
ok('3e: sprawdzenie liczby ujemnej w nawiasie', st('rozwiąż x^2 = 9').some(x => x.math.includes('L = (−3)² = 9')), st('rozwiąż x^2 = 9'));
// Δ i wzory na x w dymkach, etykiety bez wzorów
const q2 = 'rozwiąż x^2 - 5x + 6 = 0';
ok('3e: Liczę deltę z podkreśleniem', has(q2, 'Liczę deltę') && fm(q2, 'delta'), st(q2));
ok('3e: Liczę dwa rozwiązania, 2 · 1 w mianowniku', has(q2, 'Liczę dwa rozwiązania') && fm(q2, 'wzory-x12') && st(q2).some(x => x.math.includes('/ (2 · 1)')), st(q2));
ok('3e: jedno rozwiązanie', has('rozwiąż x^2 - 4x + 4 = 0', 'Liczę jedno rozwiązanie') && fm('rozwiąż x^2 - 4x + 4 = 0', 'wzor-x0'), st('rozwiąż x^2 - 4x + 4 = 0'));
ok('3e: sprawdzenie 6x² → 6 · 1²', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.math.includes('L = 1³ − 6 · 1² + 11 · 1 − 6 = 0')), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').slice(-2));
// rozkład: miejsca zerowe, potem postać iloczynowa
// rozkład jak w szkole: pierwiastki całkowite → suma i iloczyn; inaczej delta (R5)
ok('3e: rozkład sumą i iloczynem', fm('rozłóż x^2 - 5x + 6', 'wzory-viete') && fm('rozłóż x^2 - 5x + 6', 'postac-iloczynowa') && !has('rozłóż x^2 - 5x + 6', 'Liczę deltę'), st('rozłóż x^2 - 5x + 6'));
ok('3e: rozkład przez miejsca zerowe (z delty, R5)', has('rozłóż 2x^2 - 3x + 1', 'Liczę deltę') && fm('rozłóż 2x^2 - 3x + 1', 'postac-iloczynowa'), st('rozłóż 2x^2 - 3x + 1'));
// kwadrat sumy
ok('3e: kwadrat sumy', has('uprość (x + 1)^2 + 2x', 'Rozpisuję kwadrat sumy') && fm('uprość (x + 1)^2 + 2x', 'kwadrat-sumy'), st('uprość (x + 1)^2 + 2x'));
// ułamki: rozszerzanie widać, czasowniki
ok('3e: rozszerzanie ułamków', has('kroki 1/2 + 1/3', 'Sprowadzam do wspólnego mianownika 6', '⟦(1 · 3)/(2 · 3) + (1 · 2)/(3 · 2)⟧ = 3/6 + 2/6'), st('kroki 1/2 + 1/3'));
ok('3e: Dodaję liczniki', has('kroki 1/2 + 1/3', 'Dodaję liczniki'), st('kroki 1/2 + 1/3'));
// wielomian: krótka etykieta, W(r) = 0
ok('3e: wielomian W(1) = 0', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.label === 'Szukam pierwiastka wśród dzielników' && /W\(1\) = .* = 0/.test(x.math)), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0'));
// uwagi „słabego ucznia” (3e-1)
ok('3e: 4/6 + 5/6 → 9/6 → skracam do 3/2', has('kroki 2/3 + 5/6', 'Dodaję liczniki', '4/6 + 5/6 = (4 + 5)/6 = 9/6') && has('kroki 2/3 + 5/6', 'Skracam ułamek', '9/6 = 3/2'), st('kroki 2/3 + 5/6'));
ok('3e: bez (5 · 1)/(6 · 1)', !st('kroki 2/3 + 5/6').some(x => x.math.includes('· 1)')), st('kroki 2/3 + 5/6'));
ok('3e: rozwiązania z pierwiastkiem — podstawienie podkreślone', st('rozwiąż x^2 - 2x - 1 = 0').some(x => x.math.includes('x₁ = ⟦(2 − 2√2) / (2 · 1)⟧ = 1 − √2')), st('rozwiąż x^2 - 2x - 1 = 0'));
ok('2c S50: kwadrat sumy ze wzoru, kolor bez + 2x, dymek z a i b', has('uprość (x + 1)^2 + 2x', 'Rozpisuję kwadrat sumy', '(x + 1)² = ⟦x² + 2 · x · 1 + 1²⟧\n(x + 1)² + 2x = x² + 2 · x · 1 + 1² + 2x')
    && st('uprość (x + 1)^2 + 2x').some(x => x.formula && x.formula.here === 'a = x, b = 1'), st('uprość (x + 1)^2 + 2x'));
ok('3e: x² + 1 = 0 — przeniesienie nazwane', has('rozwiąż x^2 + 1 = 0', 'Przenoszę liczbę na prawo', 'x² = −1'), st('rozwiąż x^2 + 1 = 0'));
ok('3e: W(x) zdefiniowane i W(1) policzone', st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').some(x => x.math.startsWith('W(x) = x³ − 6x² + 11x − 6\ndzielniki −6: ±1, ±2, ±3, ±6\nW(1) = 1 − 6 + 11 − 6 = 0')), st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0'));
// żadna etykieta równań/ułamków nie zawiera wzoru
const eqLabels = ['rozwiąż 3(x - 2) = x + 4', q2, 'rozwiąż x^2 - 4x + 4 = 0', 'rozwiąż x^2 - 2x - 1 = 0', 'rozwiąż x^3 - 6x^2 + 11x - 6 = 0', 'rozłóż x^2 - 9', 'rozłóż x^2 - 5x + 6']
    .flatMap(q => st(q).map(x => x.label)).filter(l => /[=∓]|\(x − /.test(l));
ok('3e: etykiety bez wzorów', eqLabels.length === 0, [...new Set(eqLabels)]);

const last = S.run('rozwiąż 2x+3=7').explain.steps.slice(-1)[0];
ok('ostatni krok oznaczony', last.final === true);

// losowo: wynik zawsze spełnia równanie
const int = fc.integer({ min: -30, max: 30 });
fc.assert(fc.property(int, int, int, int, (a, b, c, d) => {
    fc.pre(a !== c);
    const r = S.run(`rozwiąż ${a}x + (${b}) = ${c}x + (${d})`);
    return r.value !== null && Math.abs((a - c) * r.value + b - d) < 1e-9;
}), { numRuns: 400 });
fc.assert(fc.property(int, int, int, (r1, r2, k) => {
    fc.pre(k !== 0);
    const b = -k * (r1 + r2), c = k * r1 * r2;
    const res = S.run(`rozwiąż ${k}x^2 + (${b})x + (${c}) = 0`);
    const want = r1 === r2 ? `x = ${r1}` : null;
    if (want) return res.text.replace('−', '-') === want;
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return res.text.replace(/−/g, '-') === `x₁ = ${lo}, x₂ = ${hi}`;
}), { numRuns: 400 });
fc.assert(fc.property(int, int, int, (a, b, c) => {
    fc.pre(a !== 0);
    const res = S.run(`rozwiąż ${a}x^2 + (${b})x + (${c}) = 0`);
    const delta = b * b - 4 * a * c;
    if (delta < 0) return res.text === 'Brak rozwiązań rzeczywistych';
    return res.explain !== null && res.text.startsWith('x');
}), { numRuns: 400 });
pass += 3;

// ── 3g: równania bez okrężnych dróg (raport E: R1–R4, zrzut Mateusza x=52+65) ──
{
    const X = 'rozwiąż x=52+65';
    ok('3g: x = 52 + 65 — liczę prawą stronę, bez sprawdzenia', has(X, 'Liczę prawą stronę', 'x = 117') && !has(X, 'Sprawdzenie') && st(X).length === 3, st(X));
    // etykieta mówi, która strona się zmieniła: bez ułamka przy x tam, gdzie ułamka nie ma (przegląd końcowy, C1)
    const noFrac = q => !has(q, 'Zapisuję ułamek przy x jako liczbę razy x');
    ok('√x = 3: x = 3² → x = 9 to rachunek po prawej', noFrac('rozwiąż sqrt(x)=3') && has('rozwiąż sqrt(x)=3', 'Liczę prawą stronę', 'x = 9'), st('rozwiąż sqrt(x)=3'));
    ok('√x = 5: bez ułamka przy x', noFrac('rozwiąż sqrt(x)=5') && has('rozwiąż sqrt(x)=5', 'Liczę prawą stronę', 'x = 25'), st('rozwiąż sqrt(x)=5'));
    ok('x + 0 = 4: upraszczam lewą stronę', noFrac('rozwiąż x+0=4') && has('rozwiąż x+0=4', 'Upraszczam lewą stronę', 'x = 4'), st('rozwiąż x+0=4'));
    ok('2x = 2³: liczę prawą stronę', noFrac('rozwiąż 2x=2^3') && has('rozwiąż 2x=2^3', 'Liczę prawą stronę', '2x = 8'), st('rozwiąż 2x=2^3'));
    ok('x/2 = 3: ułamek przy x zostaje', has('rozwiąż x/2=3', 'Zapisuję ułamek przy x jako liczbę razy x', '(1/2)x = 3'), st('rozwiąż x/2=3'));
    // partia 2c, S2: rachunki na ułamkach poziomami (wierzchołek, sprawdzenie)
    ok('2c S2: q = f(−3/4) przez wspólny mianownik', has('wierzchołek 2x^2 + 3x - 2', 'Liczę q', 'q = ⟦f(−3/4)⟧ = 2 · (−3/4)² + 3 · (−3/4) − 2 = 2 · 9/16 + 3 · (−3/4) − 2 = 9/8 − 9/4 − 2 = 9/8 − 18/8 − 16/8 = −25/8'), st('wierzchołek 2x^2 + 3x - 2'));
    ok('2c S2: sprawdzenie (9/2)/(3/2) = 3', st('rozwiąż (x+1)/(x-2) = 3').some(x => x.label === 'Sprawdzenie' && x.math.includes('L = ((7/2) + 1)/((7/2) − 2) = (9/2)/(3/2) = 3')), st('rozwiąż (x+1)/(x-2) = 3'));
    ok('2c S2: 3 · (2/5) − 1 = 6/5 − 1 = 1/5', st('rozwiąż 3x - 1 = x/2').some(x => x.label === 'Sprawdzenie' && x.math.includes('= 6/5 − 1 = 1/5')), st('rozwiąż 3x - 1 = x/2'));
    const Y = 'rozwiąż 5 = 2x - 7';
    ok('3g: x tylko po prawej — zamieniam strony', has(Y, 'Zamieniam strony', '2x − 7 = 5') && has(Y, 'Przenoszę liczby na prawo', '2x = 5 + 7') && !st(Y).some(x => /−2x/.test(x.math)), st(Y));
    const Z = 'rozwiąż x/2 + 1 = 3';
    ok('3g: x/2 — bez pustego kroku, mnożę przez 2', !has(Z, 'Porządkuję i redukuję wyrazy podobne') && has(Z, 'Mnożę obie strony przez 2', 'x = 2 · 2 = 4'), st(Z));
    ok('3g: (2/3)x = 4 — mnożę przez 3/2', has('rozwiąż 2x/3 = 4', 'Mnożę obie strony przez 3/2', 'x = 4 · 3/2 = 6'), st('rozwiąż 2x/3 = 4'));
    ok('3g: −x = 4 — zmieniam znak, nie dzielę przez −1', has('rozwiąż 7 = 3 - x', 'Zmieniam znak obu stron', 'x = −4'), st('rozwiąż 7 = 3 - x'));
    ok('3g: Bezout — przejście do drugiego czynnika', S.run('rozwiąż x^3 - 6x^2 + 11x - 6 = 0').explain.methods[1].steps.some(x => x.label === 'Przyrównuję każdy czynnik do zera' && x.math === 'x − 1 = 0 lub x² − 5x + 6 = 0\nx = 1 lub x² − 5x + 6 = 0'));
    const W = 'rozwiąż x^2 - 3x = 0';
    ok('3g: x² − 3x = 0 — bez współczynników, z x − 3 = 0', !has(W, 'Odczytuję współczynniki') && has(W, 'Wyłączam x przed nawias', 'x(x − 3) = 0')
        && has(W, 'Przyrównuję każdy czynnik do zera', 'x = 0 lub x − 3 = 0\nx = 0 lub x = 3'), st(W));
    ok('3g: delta z rachunkiem 25 − 24', has(q2, 'Liczę deltę', 'Δ = ⟦(−5)² − 4 · 1 · 6⟧ = 25 − 24 = 1'), st(q2));
    ok('3g: √Δ = √1 = 1', has(q2, 'Liczę pierwiastek z delty', '√Δ = √1 = 1'), st(q2));
    ok('3g: rozwiązania z ułamkiem przed wynikiem', has(q2, 'Liczę dwa rozwiązania', 'x₁ = ⟦(5 − 1) / (2 · 1)⟧ = 4/2 = 2\nx₂ = ⟦(5 + 1) / (2 · 1)⟧ = 6/2 = 3'), st(q2));
    ok('3g: delta z ujemnym c: 4 + 4', has('rozwiąż x^2 - 2x - 1 = 0', 'Liczę deltę', 'Δ = ⟦(−2)² − 4 · 1 · (−1)⟧ = 4 + 4 = 8'), st('rozwiąż x^2 - 2x - 1 = 0'));
}

// ── 3h: ułamki po szkolnemu (raport E: U1, U2) + błąd 3/5 : 9/10 ──
{
    ok('3h: 3/5 : 9/10 = 2/3 (ułamek przez ułamek, nie 1/150)', S.run('kroki 3/5 : 9/10').text === '2/3', S.run('kroki 3/5 : 9/10').text);
    ok('3h: dzielenie ułamków — znak „:” w zapisie i mnożenie przez odwrotność', has('kroki 3/5 : 9/10', 'Działanie', '3/5 : 9/10')
        && has('kroki 3/5 : 9/10', 'Dzielę ułamki', '3/5 : 9/10 = ⟦3/5 · 10/9⟧ = (3 · 10)/(5 · 9) = 30/45 = 2/3'), st('kroki 3/5 : 9/10'));
    ok('3h: mnożenie ułamków — licznik razy licznik', has('kroki 2/3 * 9/4', 'Mnożę ułamki', '2/3 · 9/4 = ⟦(2 · 9)/(3 · 4)⟧ = 18/12 = 3/2'), st('kroki 2/3 * 9/4'));
    ok('3h: 6 : 2 · 3 = 9 (od lewej, bez zmian)', S.run('kroki 6 : 2 * 3').text === '9', S.run('kroki 6 : 2 * 3').text);
    ok('3h: dodawanie liczników z rachunkiem', has('kroki 1/2 + 1/3', 'Dodaję liczniki', '3/6 + 2/6 = (3 + 2)/6 = 5/6'), st('kroki 1/2 + 1/3'));
    ok('3h: odejmowanie liczników z rachunkiem', has('kroki 3/4 - 1/6', 'Odejmuję liczniki', '9/12 − 2/12 = (9 − 2)/12 = 7/12'), st('kroki 3/4 - 1/6'));
    const W = require(path.join(__dirname, '..', 'js', 'step-why.js'));
    const whyCd = q => { const r = S.run(q), i = r.explain.steps.findIndex(x => /wspólnego mianownika/.test(x.label)); return W.whyFor(r.explain.steps[i], r.explain.title, r.explain, i); };
    ok('3h: skąd wspólny mianownik — konkretnie', /4.*6.*12|12.*4.*6/.test(whyCd('kroki 3/4 - 1/6')), whyCd('kroki 3/4 - 1/6'));
}

// ── 4a: nierówności (plan „jak Photomath”, pkt 1) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4a: 2x + 3 > 7 → x > 2', T('rozwiąż 2x + 3 > 7') === 'x ∈ (2, +∞)', T('rozwiąż 2x + 3 > 7'));
    ok('4a: kroki jak w równaniu, odpowiedź z przedziałem', has('rozwiąż 2x + 3 > 7', 'Przenoszę liczby na prawo', '2x > 7 − 3')
        && has('rozwiąż 2x + 3 > 7', 'Dzielę obie strony przez 2', 'x > 4/2 = 2') && has('rozwiąż 2x + 3 > 7', 'Odpowiedź', 'x > 2\nx ∈ (2, +∞)'), st('rozwiąż 2x + 3 > 7'));
    ok('4a: dzielenie przez ujemną odwraca znak', has('rozwiąż 5 - 2x ≥ 11', 'Dzielę przez −2 i odwracam znak', 'x ≤ ⟦6/(−2)⟧ = −3') && T('rozwiąż 5 - 2x ≥ 11') === 'x ∈ (−∞, −3⟩', st('rozwiąż 5 - 2x ≥ 11'));
    ok('4a: zapis <= i >=', T('rozwiąż x + 1 <= 4') === 'x ∈ (−∞, 3⟩', T('rozwiąż x + 1 <= 4'));
    ok('4a: kwadratowa < 0 między pierwiastkami', T('rozwiąż x^2 - 4 < 0') === 'x ∈ (−2, 2)', T('rozwiąż x^2 - 4 < 0'));
    ok('4a: kwadratowa ≥ 0 na zewnątrz, domknięte', T('rozwiąż x^2 - 5x + 6 ≥ 0') === 'x ∈ (−∞, 2⟩ ∪ ⟨3, +∞)', T('rozwiąż x^2 - 5x + 6 ≥ 0'));
    ok('4a: ramiona w dół', T('rozwiąż -x^2 + 1 > 0') === 'x ∈ (−1, 1)', T('rozwiąż -x^2 + 1 > 0'));
    ok('4a: parabola — krok z ramionami', st('rozwiąż x^2 - 4 < 0').some(x => x.label === 'Odczytuję znak z paraboli'), st('rozwiąż x^2 - 4 < 0'));
    ok('4a: Δ < 0 — wszystkie albo żadna', T('rozwiąż x^2 + 1 > 0') === 'x ∈ ℝ' && T('rozwiąż x^2 + 1 < 0') === 'x ∈ ∅', [T('rozwiąż x^2 + 1 > 0'), T('rozwiąż x^2 + 1 < 0')]);
    ok('4a: pierwiastek podwójny', T('rozwiąż x^2 - 4x + 4 > 0') === 'x ∈ ℝ \\ {2}' && T('rozwiąż x^2 - 4x + 4 ≤ 0') === 'x ∈ {2}', [T('rozwiąż x^2 - 4x + 4 > 0'), T('rozwiąż x^2 - 4x + 4 ≤ 0')]);
    ok('4a: zawsze prawdziwa / fałszywa', T('rozwiąż x + 1 > x') === 'x ∈ ℝ' && T('rozwiąż x + 1 < x') === 'x ∈ ∅', [T('rozwiąż x + 1 > x'), T('rozwiąż x + 1 < x')]);
    ok('4a: tytuł Nierówność', S.run('rozwiąż 2x + 3 > 7').explain.title === 'Nierówność');
}

// ── 4b: układy równań 2×2 (plan „jak Photomath”, pkt 2): podstawianie i przeciwne współczynniki ──
{
    const R1 = 'rozwiąż x + y = 5, x - y = 1';
    const r = S.run(R1), m = r && r.explain && r.explain.methods;
    ok('4b: x + y = 5, x − y = 1 → x = 3, y = 2', r && r.text === 'x = 3, y = 2', r && r.text);
    ok('4b: tytuł i dwa sposoby', r && r.explain.title === 'Układ równań' && m && m.map(x => x.label).join('|') === 'Podstawianie|Przeciwne współczynniki', m && m.map(x => x.label));
    const sub = m ? m[0].steps : [], el = m ? m[1].steps : [];
    ok('4b: podstawianie — wyznaczam y, podstawiam', sub.some(x => x.label === 'Wyznaczam y z pierwszego równania' && x.math === 'y = 5 − x')
        && sub.some(x => x.label === 'Podstawiam do drugiego równania' && x.math === '⟦x − (5 − x)⟧ = 1')
        && sub.some(x => x.label === 'Wstawiam x = 3' && x.math === 'y = 5 − 3 = 2'), sub);
    ok('4b: przeciwne współczynniki — dodaję stronami', el.some(x => x.label === 'Dodaję równania stronami' && x.math === '⟦2x⟧ = ⟦6⟧'), el);
    ok('4b: obie drogi kończą sprawdzeniem i tą samą odpowiedzią', [sub, el].every(s => s.some(x => x.label === 'Sprawdzenie') && s[s.length - 1].math === 'x = 3\ny = 2' && s[s.length - 1].final));
    ok('4b: mnożenie równania, gdy współczynniki nie są przeciwne', S.run('rozwiąż 2x + 3y = 12; 3x - 2y = 5').text === 'x = 3, y = 2'
        && S.run('rozwiąż 2x + 3y = 12; 3x - 2y = 5').explain.methods[1].steps.some(x => /^Mnożę/.test(x.label)), S.run('rozwiąż 2x + 3y = 12; 3x - 2y = 5').explain.methods[1].steps);
    ok('4b: ułamkowe rozwiązanie', S.run('rozwiąż 2x + y = 1, x - y = 1').text === 'x = 2/3, y = −1/3', S.run('rozwiąż 2x + y = 1, x - y = 1').text);
    ok('4b: sprzeczny', S.run('rozwiąż x + y = 1, x + y = 2').text === 'Brak rozwiązań', S.run('rozwiąż x + y = 1, x + y = 2').text);
    ok('4b: nieoznaczony', /^Nieskończenie wiele/.test(S.run('rozwiąż x + y = 1, 2x + 2y = 2').text), S.run('rozwiąż x + y = 1, 2x + 2y = 2').text);
    ok('4b: przecinek dziesiętny nie dzieli', S.run('rozwiąż x + 2,5 = 4').text === 'x = 1,5', S.run('rozwiąż x + 2,5 = 4').text);
}

// ── 4c: równania wymierne (plan „jak Photomath”, pkt 3) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4c: 1/x = 2', T('rozwiąż 1/x = 2') === 'x = 1/2', T('rozwiąż 1/x = 2'));
    ok('4c: dziedzina jako pierwszy krok', has('rozwiąż (x+1)/(x-2) = 3', 'Wyznaczam dziedzinę', 'x − 2 ≠ 0\nx ≠ 2\nD = ℝ \\ {2}'), st('rozwiąż (x+1)/(x-2) = 3'));
    ok('4c: mnożę przez mianownik', has('rozwiąż (x+1)/(x-2) = 3', 'Mnożę obie strony przez (x − 2)', 'x + 1 = ⟦3(x − 2)⟧') && T('rozwiąż (x+1)/(x-2) = 3') === 'x = 7/2', st('rozwiąż (x+1)/(x-2) = 3'));
    ok('4c: na krzyż', has('rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'Mnożę na krzyż', '⟦(x + 3)(x + 1)⟧ = ⟦(x − 1)(x − 1)⟧') && T('rozwiąż (x+3)/(x-1) = (x-1)/(x+1)') === 'x = −1/3', st('rozwiąż (x+3)/(x-1) = (x-1)/(x+1)'));
    ok('4c: odrzucam rozwiązanie spoza dziedziny', T('rozwiąż x^2/(x-1) = 1/(x-1)') === 'x = −1' && st('rozwiąż x^2/(x-1) = 1/(x-1)').some(x => /^Odrzucam/.test(x.label)), st('rozwiąż x^2/(x-1) = 1/(x-1)'));
    ok('4c: sprawdzenie w równaniu z ułamkiem', st('rozwiąż (x+1)/(x-2) = 3').some(x => x.label === 'Sprawdzenie'), st('rozwiąż (x+1)/(x-2) = 3'));
    ok('4c: tytuł Równanie wymierne', S.run('rozwiąż 1/x = 2').explain.title === 'Równanie');
}

// ── paczka B: nierówności wielomianowe wężykiem ──
{
    ok('wężyk: (x−1)(x−2)(x+3) > 0', text('rozwiąż (x-1)(x-2)(x+3) > 0') === 'x ∈ (−3, 1) ∪ (2, +∞)' && has('rozwiąż (x-1)(x-2)(x+3) > 0', 'Wyznaczam miejsca zerowe', 'x = −3,  x = 1,  x = 2')
        && !has('rozwiąż (x-1)(x-2)(x+3) > 0', 'Dzielę schematem Hornera'), st('rozwiąż (x-1)(x-2)(x+3) > 0'));
    ok('wężyk: x³ − 6x² + 11x − 6 > 0 przez rozkład', text('rozwiąż x^3-6x^2+11x-6 > 0') === 'x ∈ (1, 2) ∪ (3, +∞)', text('rozwiąż x^3-6x^2+11x-6 > 0'));
    ok('wężyk: pierwiastek podwójny, ≥', text('rozwiąż (x-1)^2(x+2) ≥ 0') === 'x ∈ ⟨−2, +∞)' && has('rozwiąż (x-1)^2(x+2) ≥ 0', 'Wyznaczam miejsca zerowe', 'x = −2,  x = 1 (podwójne)'), st('rozwiąż (x-1)^2(x+2) ≥ 0'));
    ok('wężyk: podwójny przy < 0 daje lukę', text('rozwiąż (x-1)^2(x+2) < 0') === 'x ∈ (−∞, −2)', text('rozwiąż (x-1)^2(x+2) < 0'));
    ok('wężyk: (x−1)²(x+2) ≤ 0 — punkt 1 osobno', text('rozwiąż (x-1)^2(x+2) ≤ 0') === 'x ∈ (−∞, −2⟩ ∪ {1}', text('rozwiąż (x-1)^2(x+2) ≤ 0'));
    ok('wężyk: a < 0 zaczyna pod osią', text('rozwiąż -2(x-1)(x+3)(x-5) ≥ 0') === 'x ∈ (−∞, −3⟩ ∪ ⟨1, 5⟩', text('rozwiąż -2(x-1)(x+3)(x-5) ≥ 0'));
    ok('wężyk: czynnik bez miejsc zerowych', text('rozwiąż (x^2+4)(x-1) ≤ 0') === 'x ∈ (−∞, 1⟩' && st('rozwiąż (x^2+4)(x-1) ≤ 0').some(x => /x² \+ 4 > 0 dla każdego x/.test(x.math)), st('rozwiąż (x^2+4)(x-1) ≤ 0'));
}

// ── 4d: równania wykładnicze i logarytmiczne (plan „jak Photomath”, pkt 4) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4d: 2^x = 8', T('rozwiąż 2^x = 8') === 'x = 3' && has('rozwiąż 2^x = 8', 'Zapisuję obie strony jako potęgi 2', '8 = 2³\n2^x = 2³')
        && has('rozwiąż 2^x = 8', 'Porównuję wykładniki', '⟦x⟧ = ⟦3⟧'), st('rozwiąż 2^x = 8'));
    ok('4d: 3^(x+1) = 27', T('rozwiąż 3^(x+1) = 27') === 'x = 2' && has('rozwiąż 3^(x+1) = 27', 'Porównuję wykładniki', '⟦x + 1⟧ = ⟦3⟧'), st('rozwiąż 3^(x+1) = 27'));
    ok('4d: 4^x = 2^(x+3) — wspólna podstawa 2', T('rozwiąż 4^x = 2^(x+3)') === 'x = 3' && has('rozwiąż 4^x = 2^(x+3)', 'Zapisuję obie strony jako potęgi 2', '(2²)^x = 2^(x + 3)\n2^(2x) = 2^(x + 3)'), st('rozwiąż 4^x = 2^(x+3)'));
    ok('4d: 2^x = 1/8 — ujemny wykładnik', T('rozwiąż 2^x = 1/8') === 'x = −3', T('rozwiąż 2^x = 1/8'));
    ok('2c S42: drugi kąt sinusa π − π/6 = 5π/6', st('rozwiąż sin(x) = 1/2').some(x => x.label === 'Zapisuję wszystkie rozwiązania' && x.math.startsWith('π − π/6 = 5π/6\n')), st('rozwiąż sin(x) = 1/2'));
    ok('2c S33: dziedzina do końca i odrzucenie przez D', st('rozwiąż √(x+3) = x - 3').some(x => x.label === 'Wyznaczam dziedzinę' && x.math === 'x + 3 ≥ 0\nx ≥ −3\nx − 3 ≥ 0\nx ≥ 3\nD = ⟨3, +∞)')
        && st('rozwiąż √(x+3) = x - 3').some(x => /x = 1 ∉ D/.test(x.math)), st('rozwiąż √(x+3) = x - 3'));
    ok('2c S41: √8 = √(4 · 2) = √4 · √2 = 2√2', has('rozwiąż x^2 - 2x - 1 = 0', 'Upraszczam pierwiastek z delty', '√Δ = √8 = √(4 · 2) = √4 · √2 = 2√2'), st('rozwiąż x^2 - 2x - 1 = 0'));
    { const m = (S.run('rozwiąż x^2-5x+6=0').explain.methods || []).find(x => x.label === 'Suma i iloczyn'), v = m && m.steps.find(x => /^Szukam dwóch liczb/.test(x.label));
      ok('2c S56: −b/a i sprawdzane pary', !!v && v.math === '⟦x₁ + x₂⟧ = −b/a = −(−5)/1 = 5, ⟦x₁ · x₂⟧ = c/a = 6/1 = 6\n1 · 6 = 6, 1 + 6 = 7 ≠ 5\n2 · 3 = 6, 2 + 3 = 5', v); }
    ok('2c S35: 1/8 = 1/2³ = 2^(−3) jako linia', has('rozwiąż 2^x = 1/8', 'Zapisuję obie strony jako potęgi 2', '1/8 = 1/2³ = 2^(−3)\n2^x = 2^(−3)'), st('rozwiąż 2^x = 1/8'));
    ok('2c S57: log bez podstawy to log₁₀', st('rozwiąż log(x) = 2').some(x => x.label === 'Korzystam z definicji logarytmu' && x.math.startsWith('log(x) = log₁₀(x)\n')), st('rozwiąż log(x) = 2'));
    ok('4d: 2^x = 5 — logarytm', T('rozwiąż 2^x = 5') === 'x = log₂(5) ≈ 2,32193' && st('rozwiąż 2^x = 5').some(x => x.label === 'Zapisuję wykładnik jako logarytm'), [T('rozwiąż 2^x = 5'), st('rozwiąż 2^x = 5')]);
    ok('4d: log_2(x) = 3', T('rozwiąż log_2(x) = 3') === 'x = 8' && has('rozwiąż log_2(x) = 3', 'Korzystam z definicji logarytmu', 'x = ⟦2³⟧ = 8'), st('rozwiąż log_2(x) = 3'));
    ok('4d: log_3(2x-1) = 2 — dziedzina', T('rozwiąż log_3(2x-1) = 2') === 'x = 5' && has('rozwiąż log_3(2x-1) = 2', 'Wyznaczam dziedzinę', '2x − 1 > 0\nx > 1/2\nD = (1/2, +∞)'), st('rozwiąż log_3(2x-1) = 2'));
    ok('4d: log(x) = 2 — podstawa 10', T('rozwiąż log(x) = 2') === 'x = 100', T('rozwiąż log(x) = 2'));
    ok('4d: log_b(A) = log_b(B)', T('rozwiąż log_2(x+3) = log_2(2x)') === 'x = 3', T('rozwiąż log_2(x+3) = log_2(2x)'));
    ok('4d: pusta dziedzina kończy od razu (raport F, M4)', st('rozwiąż log_2(x-5) = log_2(1-x)').length === 3 && has('rozwiąż log_2(x-5) = log_2(1-x)', 'Wyznaczam dziedzinę', 'x − 5 > 0\nx > 5\n1 − x > 0\nx < 1\nD = ∅'), st('rozwiąż log_2(x-5) = log_2(1-x)'));
    ok('4d: x > 0 tylko raz', has('rozwiąż log_2(x) = 3', 'Wyznaczam dziedzinę', 'x > 0\nD = (0, +∞)'), st('rozwiąż log_2(x) = 3'));
    ok('4d: odrzucenie spoza dziedziny logarytmu', T('rozwiąż log_2(x-5) = log_2(1-x)') === 'Brak rozwiązań', T('rozwiąż log_2(x-5) = log_2(1-x)'));
}

// ── 4e: wartość bezwzględna i równania z pierwiastkiem (plan „jak Photomath”, pkt 5) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4e: |x − 2| = 3', T('rozwiąż |x-2| = 3') === 'x₁ = −1, x₂ = 5' && has('rozwiąż |x-2| = 3', 'Rozbijam na dwa przypadki', 'x − 2 = ⟦3⟧ lub x − 2 = ⟦−3⟧'), st('rozwiąż |x-2| = 3'));
    ok('4e: |x| = −1 — brak', T('rozwiąż |x| = -1') === 'Brak rozwiązań', T('rozwiąż |x| = -1'));
    ok('4e: |2x + 1| = 0', T('rozwiąż |2x+1| = 0') === 'x = −1/2', T('rozwiąż |2x+1| = 0'));
    ok('4e: |x − 2| < 3 → (−1, 5)', T('rozwiąż |x-2| < 3') === 'x ∈ (−1, 5)' && has('rozwiąż |x-2| < 3', 'Zamieniam na podwójną nierówność', '⟦−3⟧ < x − 2 < ⟦3⟧'), st('rozwiąż |x-2| < 3'));
    ok('4e: |x − 2| ≥ 3 → suma', T('rozwiąż |x-2| >= 3') === 'x ∈ (−∞, −1⟩ ∪ ⟨5, +∞)', T('rozwiąż |x-2| >= 3'));
    ok('4e: |x| > −2 → ℝ', T('rozwiąż |x| > -2') === 'x ∈ ℝ', T('rozwiąż |x| > -2'));
    ok('4e: √(x + 3) = x − 3 → x = 6 (1 odrzucone)', T('rozwiąż √(x+3) = x - 3') === 'x = 6'
        && has('rozwiąż √(x+3) = x - 3', 'Podnoszę obie strony do kwadratu', 'x + 3 = ⟦(x − 3)²⟧') && st('rozwiąż √(x+3) = x - 3').some(x => /^Odrzucam/.test(x.label)), st('rozwiąż √(x+3) = x - 3'));
    ok('4e: sqrt(2x − 1) = 3', T('rozwiąż sqrt(2x-1) = 3') === 'x = 5', T('rozwiąż sqrt(2x-1) = 3'));
    ok('4e: √x = −2 — brak', T('rozwiąż √x = -2') === 'Brak rozwiązań', T('rozwiąż √x = -2'));
}

// ── 4f: równania trygonometryczne (plan „jak Photomath”, pkt 6) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4f: sin x = 1/2', T('rozwiąż sin(x) = 1/2') === 'x = π/6 + 2kπ lub x = 5π/6 + 2kπ, k ∈ ℤ'
        && has('rozwiąż sin(x) = 1/2', 'Odczytuję kąt z tablicy', '⟦sin(π/6)⟧ = 1/2'), st('rozwiąż sin(x) = 1/2'));
    ok('4f: cos x = √2/2', T('rozwiąż cos(x) = sqrt(2)/2') === 'x = π/4 + 2kπ lub x = −π/4 + 2kπ, k ∈ ℤ', T('rozwiąż cos(x) = sqrt(2)/2'));
    ok('4f: tg x = 1', T('rozwiąż tg(x) = 1') === 'x = π/4 + kπ, k ∈ ℤ', T('rozwiąż tg(x) = 1'));
    ok('4f: sin x = −1/2', T('rozwiąż sin(x) = -1/2') === 'x = −π/6 + 2kπ lub x = 7π/6 + 2kπ, k ∈ ℤ', T('rozwiąż sin(x) = -1/2'));
    ok('4f: sin x = 0, cos x = 1, cos x = 0', T('rozwiąż sin(x) = 0') === 'x = kπ, k ∈ ℤ' && T('rozwiąż cos(x) = 1') === 'x = 2kπ, k ∈ ℤ' && T('rozwiąż cos(x) = 0') === 'x = π/2 + kπ, k ∈ ℤ',
        [T('rozwiąż sin(x) = 0'), T('rozwiąż cos(x) = 1'), T('rozwiąż cos(x) = 0')]);
    ok('4f: sin x = 2 — brak', T('rozwiąż sin(x) = 2') === 'Brak rozwiązań' && st('rozwiąż sin(x) = 2').some(x => /^Sinus przyjmuje/.test(x.label)), st('rozwiąż sin(x) = 2'));
    ok('4f: sin(2x) = 1/2 — dzielę serie', T('rozwiąż sin(2x) = 1/2') === 'x = π/12 + kπ lub x = 5π/12 + kπ, k ∈ ℤ' && st('rozwiąż sin(2x) = 1/2').some(x => x.label === 'Wyliczam x'), st('rozwiąż sin(2x) = 1/2'));
    ok('4f: tytuł', S.run('rozwiąż sin(x) = 1/2').explain.title === 'Równanie trygonometryczne');
}

// ── 4g: NWD, NWW, wierzchołek paraboli (plan „jak Photomath”, pkt 7) ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4g: nwd(12, 18) = 6', T('nwd(12, 18)') === '6' && has('nwd(12, 18)', 'Rozkładam na czynniki pierwsze', '12 = 2 · 2 · 3\n18 = 2 · 3 · 3')
        && has('nwd(12, 18)', 'Mnożę wspólne czynniki', 'NWD(12, 18) = ⟦2 · 3⟧ = 6'), st('nwd(12, 18)'));
    ok('4g: NWD 12 18 (bez nawiasów, wielkie litery)', T('NWD 12 18') === '6', T('NWD 12 18'));
    ok('4g: nww(4, 6) = 12', T('nww(4, 6)') === '12' && has('nww(4, 6)', 'Mnożę czynniki w najwyższej potędze', 'NWW(4, 6) = ⟦2 · 2 · 3⟧ = 12'), st('nww(4, 6)'));
    ok('4g: względnie pierwsze', T('nwd(8, 15)') === '1' && T('nww(8, 15)') === '120', [T('nwd(8, 15)'), T('nww(8, 15)')]);
    ok('4g: trzy liczby', T('nwd(12, 18, 30)') === '6' && T('nww(2, 3, 4)') === '12', [T('nwd(12, 18, 30)'), T('nww(2, 3, 4)')]);
    ok('4g: wierzchołek x² − 4x + 3', T('wierzchołek x^2 - 4x + 3') === 'W = (2, −1)'
        && has('wierzchołek x^2 - 4x + 3', 'Liczę q', 'q = ⟦f(2)⟧ = 2² − 4 · 2 + 3 = −1')
        && has('wierzchołek x^2 - 4x + 3', 'Zapisuję postać kanoniczną', 'f(x) = (x − 2)² − 1'), st('wierzchołek x^2 - 4x + 3'));
    ok('4g: wierzchołek z ułamkiem i a ≠ 1', T('wierzchołek 2x^2 + 3x - 2') === 'W = (−3/4, −25/8)', T('wierzchołek 2x^2 + 3x - 2'));
    ok('4g: wierzchołek y = …', T('wierzchołek y = -x^2 + 2x') === 'W = (1, 1)', T('wierzchołek y = -x^2 + 2x'));
}

// ── 4h: procenty krok po kroku ──
{
    const T = q => { const r = S.run(q); return r && r.text; };
    ok('4h: 20% z 150', T('kroki 20% z 150') === '30' && has('kroki 20% z 150', 'Zamieniam procent na ułamek', '20% = ⟦20/100⟧ = 1/5') && has('kroki 20% z 150', 'Mnożę ułamek przez liczbę', '1/5 · 150 = 30'), st('kroki 20% z 150'));
    ok('4h: 150 + 20%', T('kroki 150 + 20%') === '180' && has('kroki 150 + 20%', 'Dodaję procent do liczby', '⟦150 + 30⟧ = 180'), st('kroki 150 + 20%'));
    ok('4h: 200 − 15%', T('kroki 200 - 15%') === '170', T('kroki 200 - 15%'));
    ok('4h: ile procent 30 z 120', T('kroki ile procent 30 z 120') === '25%' && has('kroki ile procent 30 z 120', 'Zamieniam ułamek na procent', '⟦1/4 · 100%⟧ = 25%'), st('kroki ile procent 30 z 120'));
    ok('4h: 12,5% z 80', T('kroki 12,5% z 80') === '10', T('kroki 12,5% z 80'));
}

// sposoby etap 2+3 (spec 2026-11-23-sposoby-design.md): suma i iloczyn obok delty, schemat Hornera przy Bezoucie
{
    const meth = q => { const m = S.run(q).explain.methods; return m ? m.map(x => x.label) : []; };
    const Q = 'rozwiąż x^2 - 5x + 6 = 0', mq = S.run(Q).explain.methods;
    ok('2+3: x² − 5x + 6 — delta i suma i iloczyn', JSON.stringify(meth(Q)) === JSON.stringify(['Delta', 'Suma i iloczyn']), meth(Q));
    const vs = mq && mq[1].steps.find(x => x.formula && x.formula.id === 'wzory-viete');
    ok('2+3: suma i iloczyn — para liczb i dymek z liczbami', !!vs && /⟦/.test(vs.math) && /2 \+ 3 = 5/.test(vs.math) && /2 · 3 = 6/.test(vs.math) && vs.formula.here === 'a = 1, b = −5, c = 6', vs);
    ok('2+3: ta sama odpowiedź, krócej', !!mq && mq[1].steps[mq[1].steps.length - 1].math === mq[0].steps[mq[0].steps.length - 1].math && mq[1].steps.length < mq[0].steps.length, mq && mq.map(m => m.steps.length));
    ok('2+3: x² + x − 12 — ujemny pierwiastek', meth('rozwiąż x^2 + x - 12 = 0').length === 2, meth('rozwiąż x^2 + x - 12 = 0'));
    ok('2+3: bez sumy i iloczynu przy niewymiernych, a ≠ 1, podwójnym', meth('rozwiąż x^2 - 2x - 1 = 0').length === 0 && meth('rozwiąż 2x^2 - 6x + 4 = 0').length === 0 && meth('rozwiąż x^2 - 4x + 4 = 0').length === 0);
    const C = st('rozwiąż x^3 - 6x^2 + 11x - 6 = 0'), labs = C.map(x => x.label);
    const hi = labs.indexOf('Dzielę schematem Hornera'), h = C[hi];
    ok('2+3: kolejność — pierwiastek, Horner, iloczyn', hi > 0 && labs[hi - 1] === 'Szukam pierwiastka wśród dzielników' && labs[hi + 1] === 'Zapisuję iloczyn', labs);
    ok('2+3: Horner — tekst dzielenia i tabelka', !!h && h.math.replace(/[⟦⟧]/g, '') === '(x³ − 6x² + 11x − 6) : (x − 1) = x² − 5x + 6'
        && JSON.stringify(h.horner) === JSON.stringify({ r: '1', top: ['1', '−6', '11', '−6'], mid: ['', '1', '−5', '6'], bot: ['1', '−5', '6', '0'] }), h);
    ok('2+3: dymek Bezouta przy iloczynie', !!C[hi + 1] && C[hi + 1].formula && C[hi + 1].formula.id === 'bezout' && /⟦\(x − 1\)\(x² − 5x \+ 6\)⟧/.test(C[hi + 1].math), C[hi + 1]);
}

// rozwiąż: wielomian stopnia >= 3 — rozkład jak w szkole obok Hornera (zad. 3)
{
    const hs = q => S.run(q).explain;
    const fid = (q, id) => hs(q).steps.some(x => x.formula && x.formula.id === id);
    ok('x^3-x=0: pierwiastki', text('rozwiąż x^3-x=0') === 'x₁ = −1, x₂ = 0, x₃ = 1', text('rozwiąż x^3-x=0'));
    ok('x^3-x=0: wyłączanie przed nawias', fid('rozwiąż x^3-x=0', 'wylaczanie-przed-nawias'));
    ok('x^4-5x^2+4=0: cztery pierwiastki', text('rozwiąż x^4-5x^2+4=0') === 'x₁ = −2, x₂ = −1, x₃ = 1, x₄ = 2', text('rozwiąż x^4-5x^2+4=0'));
    ok('x^4-5x^2+4=0: podstawienie t', fid('rozwiąż x^4-5x^2+4=0', 'podstawienie-t'));
    ok('x^3-6x^2+11x-6=0: wynik bez zmian', text('rozwiąż x^3-6x^2+11x-6=0') === 'x₁ = 1, x₂ = 2, x₃ = 3');
    ok('x^4-3x^2+1=0: nadal nieobsługiwane', /Jeszcze tego nie/.test(text('rozwiąż x^4-3x^2+1=0')), text('rozwiąż x^4-3x^2+1=0'));
    ok('x^4+x^2-6=0: ±√2', text('rozwiąż x^4+x^2-6=0') === 'x₁ = −√2, x₂ = √2', text('rozwiąż x^4+x^2-6=0'));
    ok('x^4+x^2-6=0: brak rozwiązań rzeczywistych w kroku', S.run('rozwiąż x^4+x^2-6=0').explain.steps.some(x => /brak rozwiązań rzeczywistych/.test(x.math)));
    ['rozwiąż x^3-6x^2+11x-6=0', 'rozwiąż x^4-5x^2+4=0', 'rozwiąż 2x^3-3x^2-2x+3=0'].forEach(q => {
        const m = hs(q).methods;
        ok(q + ': sposoby', !!m && m.map(x => x.label).join('|') === 'Rozkład na czynniki|Schemat Hornera', m && m.map(x => x.label));
        ok(q + ': ten sam ostatni krok', !!m && JSON.stringify(m[0].steps.slice(-1)) === JSON.stringify(m[1].steps.slice(-1)));
    });
}

// uprość ułamek wielomianów: rozkład szkolny, skrócenie, zastrzeżenie dziedziny
{
    const w = (q, want) => ok(q + ' → ' + want, text(q) === want, text(q));
    w('uprość (x^2-4)/(x+2)', 'x − 2 (dla x ≠ −2)');
    w('uprość x/(x^2-x)', '1/(x − 1) (dla x ≠ 0, x ≠ 1)');
    w('uprość (x^2-1)/(2x-2)', '(x + 1)/2 (dla x ≠ 1)');
    w('uprość (x^2-2x+1)/(x^2-1)', '(x − 1)/(x + 1) (dla x ≠ −1, x ≠ 1)');
    w('uprość (x^3+x)/(x^2+1)', 'x');
    ok('(x^2+1)/(x+1): bez zmian, nic się nie skraca', /Jeszcze tego nie/.test(text('uprość (x^2+1)/(x+1)')), text('uprość (x^2+1)/(x+1)'));
    ok('niewymierne zero mianownika: bez zmian', /Jeszcze tego nie/.test(text('uprość (x^2-1)/(x^2-2)')), text('uprość (x^2-1)/(x^2-2)'));
    ok('uprość (x^2-4)/(x+2): kroki', labels('uprość (x^2-4)/(x+2)') === 'Wyrażenie | Rozkładam różnicę kwadratów w liczniku | Zastrzegam dziedzinę | Skracam (x + 2)', labels('uprość (x^2-4)/(x+2)'));
    ok('uprość (x^2-4)/(x+2): wzór w dymku', fm('uprość (x^2-4)/(x+2)', 'roznica-kwadratow'));
    ok('uprość (x+1)/2: bez zmian', text('uprość (x+1)/2') === '(1/2)x + 1/2', text('uprość (x+1)/2'));
}

{
    const w2 = (q, want) => ok(q + ' → ' + want, text(q) === want, text(q));
    const lb = q => labels(q).split(' | ');
    ok('(x^2-1)/(2x-2): wspólny czynnik w mianowniku', lb('uprość (x^2-1)/(2x-2)').includes('Wyłączam wspólny czynnik przed nawias w mianowniku') && st('uprość (x^2-1)/(2x-2)').some(x => x.math === '2x − 2 = ⟦2(x − 1)⟧' && x.formula && x.formula.id === 'wylaczanie-przed-nawias'), labels('uprość (x^2-1)/(2x-2)'));
    ok('(2x+4)/(x^2-4): wspólny czynnik w liczniku', lb('uprość (2x+4)/(x^2-4)').includes('Wyłączam wspólny czynnik przed nawias w liczniku') && st('uprość (2x+4)/(x^2-4)').some(x => x.math === '2x + 4 = ⟦2(x + 2)⟧'), labels('uprość (2x+4)/(x^2-4)'));
    w2('uprość (2x+4)/(x^2-4)', '2/(x − 2) (dla x ≠ −2, x ≠ 2)');
    w2('uprość (x^2-9)/(3-x)', '−(x + 3) (dla x ≠ 3)');
    const m9 = st('uprość (x^2-9)/(3-x)');
    ok('(x^2-9)/(3-x): krok z minusem', m9.some(x => x.label === 'Wyłączam minus przed nawias w mianowniku' && x.math === '3 − x = ⟦−(x − 3)⟧'), m9);
    ok('(x^2-9)/(3-x): dziedzina w zapisie użytkownika', m9.some(x => x.label === 'Zastrzegam dziedzinę' && x.math.startsWith('3 − x ≠ 0')), m9);
    ok('(x^2-9)/(3-x): minus przed całym licznikiem', m9.some(x => /^Skracam/.test(x.label) && x.math.startsWith('−((x − 3)(x + 3))/(x − 3) = ')), m9);
    // wynik równa się oryginałowi w dwóch punktach (tam, gdzie określony)
    const f = {
        '(x^2-4)/(x+2)': x => (x * x - 4) / (x + 2), 'x/(x^2-x)': x => x / (x * x - x), '(x^2-1)/(2x-2)': x => (x * x - 1) / (2 * x - 2),
        '(x^2-5x+6)/(x^2-4)': x => (x * x - 5 * x + 6) / (x * x - 4), '(x^3-x)/(x^2+x)': x => (x ** 3 - x) / (x * x + x),
        '(2x+4)/(x^2-4)': x => (2 * x + 4) / (x * x - 4), '(x^2-9)/(3-x)': x => (x * x - 9) / (3 - x), '(x^2+2x+1)/(x+1)': x => (x * x + 2 * x + 1) / (x + 1)
    };
    const ev = (t, x) => Function('x', 'return ' + t.replace(/ \(dla.*$/, '').replace(/−/g, '-').replace(/(\d|\))(?=[x(])/g, '$1*').replace(/x(?=\()/g, 'x*'))(x); // wynik aplikacji jako wyrażenie JS
    Object.keys(f).forEach(q => {
        const t = text('uprość ' + q);
        ok(q + ' ma wynik z zastrzeżeniem', /\(dla x ≠/.test(t), t);
        [3.5, -7.25].forEach(x => ok(q + ' w x=' + x, Math.abs(f[q](x) - ev(t, x)) < 1e-9, t));
    });
}

// Sprawdzenie obejmuje każdy pierwiastek z odpowiedzi (x⁴ − 5x² + 4: także x = 2)
for (const q of ['rozwiąż x^4-5x^2+4=0', 'rozwiąż x^3-6x^2+11x-6=0']) {
    const s = st(q), chk = (s.find(x => x.label === 'Sprawdzenie') || { math: '' }).math, ans = s.find(x => x.label === 'Odpowiedź').math.split('\n').map(l => l.split(' = ')[1]);
    ok(q + ': Sprawdzenie dla każdego pierwiastka', ans.every(r => chk.split('\n').some(l => l.startsWith('x = ' + r + ':'))), chk);
}

// uprość: nawiasy z liczbami całkowitymi (jak rozkład szkolny), łańcuch kroków bez przeskoków
{
    const w3 = (q, want) => ok(q + ' → ' + want, text(q) === want, text(q));
    const chain = q => { // każdy krok skracania zaczyna się od tego, na czym skończył się poprzedni krok
        const s = st(q), i = s.findIndex(x => /^Skracam/.test(x.label)), prev = s.slice(1, i).filter(x => !/^Zastrzegam/.test(x.label)).map(x => x.math.split(' = ').pop().replace(/[⟦⟧]/g, ''));
        return { s, cancel: s[i], prev };
    };
    w3('uprość (4x^2-1)/(2x-1)', '2x + 1 (dla x ≠ 1/2)');
    ok('(4x^2-1)/(2x-1): Skracam (2x − 1)', st('uprość (4x^2-1)/(2x-1)').some(x => x.label === 'Skracam (2x − 1)'), labels('uprość (4x^2-1)/(2x-1)'));
    w3('uprość (2x^2-x-1)/(x-1)', '2x + 1 (dla x ≠ 1)');
    const c2 = chain('uprość (2x^2-x-1)/(x-1)');
    ok('(2x^2-x-1)/(x-1): skracanie od (2x + 1)(x − 1)/(x − 1)', c2.cancel && c2.cancel.math.startsWith('(2x + 1)(x − 1)/(x − 1) = '), c2.cancel);
    w3('uprość (x-1)/(2x^2-x-1)', '1/(2x + 1) (dla x ≠ −1/2, x ≠ 1)');
    const c4 = chain('uprość (x^2-0.25)/(x-0.5)');
    ok('(x^2-0.25)/(x-0.5): bez (0,25)', !c4.s.some(x => x.math.includes('(0,25)')), c4.s);
    ok('(x^2-0.25)/(x-0.5): skracam (2x − 1)', c4.cancel && c4.cancel.label === 'Skracam (2x − 1)' && c4.cancel.math.startsWith('0,25(2x − 1)(2x + 1)/(0,5(2x − 1)) = '), c4.cancel);
    w3('uprość (x^2-0.25)/(x-0.5)', 'x + 0,5 (dla x ≠ 0,5)');
}

console.log(`math-steps: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
