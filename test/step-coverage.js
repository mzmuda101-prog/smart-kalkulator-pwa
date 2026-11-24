// @ts-check
// Bramka pokrycia dymków (spec 2026-11-24-dymki-podstawy, cel 3): każdy krok-przekształcenie ma dymek.
// Przechodzi przez wszystkie zadania z scripts/steps-check/queries.js i wszystkie sposoby.
// Krok bez `formula.id` musi być stwierdzeniem (STATEMENTS) albo rodzajem z jawnej listy PENDING.
// Uruchom: node test/step-coverage.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { FORMULAS, STEP_RULES, STATEMENTS, attachRule } = require(path.join(root, 'js', 'step-formulas.js'));
const queries = require(path.join(root, 'scripts', 'steps-check', 'queries.js'));

let pass = 0, fail = 0;
/** @param {string} name @param {boolean} cond @param {unknown} [got] */
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}

/** rodzaj kroku: liczby → #, nawiasy → (…), pojedyncza litera-zmienna → v (bez polskich „a i o u w z”) */
const kind = (/** @type {string} */ label) => label.replace(/[−+]?\d+([.,/]\d+)?/g, '#').replace(/\([^)]*\)/g, '(…)')
    .replace(/(?<!\p{L})[b-hj-np-tvx-y](?!\p{L})/gu, 'v').trim();

// Rodzaje kroków-przekształceń, które jeszcze nie mają hasła. Lista ma tylko maleć:
// bramka pada, gdy wpis nie jest już potrzebny (żaden krok bez dymku go nie używa).
const PENDING = [
    "Sprawdzenie", // tylko całki: „(x³/3)′ = x² ✓” (pochodna wyniku; równania i układy → sprawdzenie)
    "Podstawiamy v = #", // 65× „Podstawiamy x = 4”
    "Wyrazy z v w mianowniku dążą do #", // 53× „Wyrazy z n w mianowniku dążą do 0”
    "Skracamy (…)", // 40× „Skracamy (−x)”
    "Rozkładamy na czynniki", // 37× „Rozkładamy na czynniki”
    "Zapisujemy inaczej", // 27× „Zapisujemy inaczej”
    "Upraszczamy", // 26× „Upraszczamy”
    "Wyłączamy v przed nawias", // 19× „Wyłączamy n przed nawias”
    "Skracamy v", // 19× „Skracamy n”
    "Składamy wynik", // 18× „Składamy wynik”
    "Granica wykładnika", // 14× „Granica wykładnika”
    "Szukam pierwiastka wśród dzielników", // 11× „Szukam pierwiastka wśród dzielników”
    "Wyłączamy v² przed nawias", // 10× „Wyłączamy n² przed nawias”
    "Skracamy v²", // 10× „Skracamy n²”
    "Kolorowy ułamek dąży do #", // 8× „Kolorowy ułamek dąży do 1”
    "Stałą wyłączam przed całkę", // 8× „Stałą wyłączam przed całkę”
    "Mnożę przez wyłączoną stałą", // 8× „Mnożę przez wyłączoną stałą”
    "Wyłączamy najwyższe potęgi przed nawias", // 5× „Wyłączamy najwyższe potęgi przed nawias”
    "Liczę pierwiastek z delty w liczniku", // 5× „Liczę pierwiastek z delty w liczniku”
    "Wciągam liczbę do nawiasu w liczniku", // 5× „Wciągam liczbę do nawiasu w liczniku”
    "Stała zostaje przed pochodną", // 5× „Stała zostaje przed pochodną”
    "Wyłączamy v³ przed nawias", // 4× „Wyłączamy n³ przed nawias”
    "Wyłączamy √v przed nawias", // 4× „Wyłączamy √n przed nawias”
    "Skracamy √v", // 4× „Skracamy √n”
    "Wyłączamy (…) przed nawias", // 4× „Wyłączamy (−x) przed nawias”
    "Liczę pierwiastek z delty w mianowniku", // 4× „Liczę pierwiastek z delty w mianowniku”
    "Wciągam liczbę do nawiasu w mianowniku", // 4× „Wciągam liczbę do nawiasu w mianowniku”
    "Szukam miejsc zerowych", // 4× „Szukam miejsc zerowych”
    "Skracam (…)", // 4× „Skracam (2x − 1)”
    "Rozkładam mianownik", // 4× „Rozkładam mianownik”
    "Zapisuję ułamki proste", // 4× „Zapisuję ułamki proste”
    "Wyznaczam A i B", // 4× „Wyznaczam A i B”
    "Rozkład na ułamki proste", // 4× „Rozkład na ułamki proste”
    "Każdy ułamek daje logarytm", // 4× „Każdy ułamek daje logarytm”
    "Skracamy v³", // 3× „Skracamy n³”
    "Mnożę przez stałą", // 3× „Mnożę przez stałą”
    "Całkuję każdą część", // 3× „Całkuję każdą część”
    "Wracam do zmiennej v", // 3× „Wracam do zmiennej x”
    "Wyłączamy v√v przed nawias", // 2× „Wyłączamy n√n przed nawias”
    "Skracamy v√v", // 2× „Skracamy n√n”
    "Logarytm jest ciągły", // 2× „Logarytm jest ciągły”
    "Rozwiązuję podwójną nierówność", // 2× „Rozwiązuję podwójną nierówność”
    "Mnożę", // 2× „Mnożę”
    "Upraszczam pierwiastek z delty", // 2× „Upraszczam pierwiastek z delty”
    "Kwadrat nie może być ujemny", // 2× „Kwadrat nie może być ujemny”
    "Liczę prawą stronę", // 2× „Liczę prawą stronę”
    "Porządkuję równania", // 2× „Porządkuję równania”
    "Podstawienie: v = v²", // 2× „Podstawienie: t = x²”
    "Wyłączamy v⁵ przed nawias", // 1× „Wyłączamy n⁵ przed nawias”
    "Skracamy v⁵", // 1× „Skracamy n⁵”
    "Rozbijamy na dwie różnice", // 1× „Rozbijamy na dwie różnice”
    "Dodajemy granice", // 1× „Dodajemy granice”
    "Wyłączamy v⁶ przed nawias", // 1× „Wyłączamy n⁶ przed nawias”
    "Skracamy v⁶", // 1× „Skracamy n⁶”
    "Dla v → −∞", // 1× „Dla x → −∞”
    "Wyłączamy √(…) przed nawias", // 1× „Wyłączamy √(−x) przed nawias”
    "Skracamy √(…)", // 1× „Skracamy √(−x)”
    "Szukam pierwiastka wśród dzielników w liczniku", // 1× „Szukam pierwiastka wśród dzielników w liczniku”
    "Szukam pierwiastka wśród dzielników w mianowniku", // 1× „Szukam pierwiastka wśród dzielników w mianowniku”
    "Skracamy (…)²", // 1× „Skracamy (x + 1)²”
    "Najpierw nawias: dodaję", // 1× „Najpierw nawias: dodaję”
    "Potęguję", // 1× „Potęguję”
    "Granica jednostronna #⁺", // 1× „Granica jednostronna 0⁺”
    "Wyciągam kwadrat spod pierwiastka", // 1× „Wyciągam kwadrat spod pierwiastka”
    "Podstawiamy v → ∞", // 1× „Podstawiamy n → ∞”
    "Wciągam liczbę do nawiasu", // 1× „Wciągam liczbę do nawiasu”
    "Brak miejsc zerowych", // 1× „Brak miejsc zerowych”
    "Odczytuję znak z paraboli", // 1× „Odczytuję znak z paraboli”
    "Wyliczam v", // 1× „Wyliczam x”
    "Skracam ułamek", // 1× „Skracam ułamek”
    "Dzielę", // 1× „Dzielę”
    "Całka sumy to suma całek", // 1× „Całka sumy to suma całek”
    "Całkuję stałą", // 1× „Całkuję stałą”
    "Dzielę licznik przez mianownik", // 1× „Dzielę licznik przez mianownik”
    "Podstawienie: v = #v + #", // 1× „Podstawienie: t = 2x + 1”
];

// ── attachRule ──
ok('STEP_RULES: każde id istnieje w słowniku', STEP_RULES.every((/** @type {{id: string}} */ r) => !!FORMULAS[r.id]),
    STEP_RULES.filter((/** @type {{id: string}} */ r) => !FORMULAS[r.id]).map((/** @type {{id: string}} */ r) => r.id));
ok('„Liczę pierwiastek z delty” → delta', (attachRule({ label: 'Liczę pierwiastek z delty', math: '√Δ = √196 = 14' }).formula || {}).id === 'delta');
ok('„Składam całość” → postac-iloczynowa', (attachRule({ label: 'Składam całość', math: 'x³ − x = x(x − 1)(x + 1)' }).formula || {}).id === 'postac-iloczynowa');
{
    const red = attachRule({ label: 'Redukuję wyrazy podobne', math: '2x = 10' });
    ok('„Redukuję wyrazy podobne”: hasło ze słownika albo rodzaj w PENDING',
        red.formula ? !!FORMULAS[red.formula.id] : PENDING.includes(kind(red.label)), red);
}
{
    const own = { label: 'Liczę pierwiastek z delty', math: '⟦√Δ⟧', formula: { id: 'wzory-x12', here: 'a = 1' } }, f = own.formula;
    ok('krok z własnym formula zostaje nietknięty', attachRule(own) === own && own.formula === f && f.id === 'wzory-x12' && f.here === 'a = 1', own);
    const st = { label: 'Wynik', math: 'x = 5' };
    ok('stwierdzenie bez dymku', !attachRule(st).formula && STATEMENTS.some((/** @type {RegExp} */ re) => re.test('Wynik')), st);
}
{ // drugi sposób (explain.methods[1]) też przechodzi przez attachRule
    const r = S.run('rozwiąż x + y = 5, x - y = 1'), m = r.explain.methods && r.explain.methods[1];
    const st = m && m.steps.find((/** @type {{label: string}} */ s) => /^Wstawiam .* do pierwszego równania$/.test(s.label));
    ok('methods[1]: „Wstawiam … do pierwszego równania” → uklad-przeciwne', !!st && !!st.formula && st.formula.id === 'uklad-przeciwne', st);
}

{ // „Składam całość” → postac-iloczynowa tylko, gdy każdy czynnik jest liniowy (hasło pokazuje nawiasy z miejsc zerowych)
    const step = (/** @type {string} */ q) => (S.run(q).explain.steps.find((/** @type {{label: string}} */ s) => s.label === 'Składam całość'));
    for (const q of ['rozłóż x^4-1', 'rozwiąż x^4-16=0', 'rozłóż x^6 - 64']) {
        const st = step(q);
        ok(q + ': „Składam całość” bez postac-iloczynowa (czynnik kwadratowy)', !!st && !(st.formula && st.formula.id === 'postac-iloczynowa'), st);
    }
    for (const q of ['rozłóż x^3-x', 'rozłóż 2x^3-8x', 'rozłóż x^3 - 3x + 2']) {
        const st = step(q);
        ok(q + ': „Składam całość” → postac-iloczynowa', !!st && !!st.formula && st.formula.id === 'postac-iloczynowa', st);
    }
}
{ // podstawy równań (zadanie 3): etykieta → hasło, z liczbami z kroku tam, gdzie da się je odczytać
    const rule = (/** @type {string} */ label, /** @type {string} */ math) => attachRule({ label: label, math: math }).formula || {};
    /** @type {Array<[string, string, string, string?]>} */
    const MAP = [
        ['Redukuję wyrazy podobne', '2x = 10', 'wyrazy-podobne'],
        ['Porządkuję i redukuję wyrazy podobne', '2x − 5 = 1', 'wyrazy-podobne'],
        ['Opuszczam nawiasy', '3x − 6 = x + 4', 'opuszczanie-nawiasow'],
        ['Przenoszę liczby na prawo', '2x = 11 − 3', 'przenoszenie'],
        ['Przenoszę liczbę na prawo', 'x² = 4', 'przenoszenie'],
        ['Przenoszę x na lewo, liczby na prawo', '3x − x = 4 + 6', 'przenoszenie'],
        ['Przenoszę x na lewo', '2x − x = 3', 'przenoszenie'],
        ['Przenoszę wszystko na lewą stronę', '−x² + 7x − 6 = 0', 'przenoszenie'],
        ['Dzielę obie strony przez −2', 'x = −7 / (−2) = 7/2', 'obie-strony', 'c = −2'],
        ['Mnożę obie strony przez 3/2', 'x = 4 · 3/2 = 6', 'obie-strony', 'c = 3/2'],
        ['Zmieniam znak obu stron', 'x = −4', 'obie-strony'],
        ['Zamieniam strony', '2x − 7 = 5', 'obie-strony'],
        ['Pierwiastkuję obie strony (są dwa znaki)', 'x = ±3', 'pierwiastkowanie-obu-stron'],
        ['Przyrównuję każdy czynnik do zera', 'x = 0 lub x − 3 = 0\nx = 0 lub x = 3', 'iloczyn-rowny-zero'],
        ['Sprawdzenie', 'x = 5:  L = 3(5 − 2) = 9,  P = 5 + 4 = 9 ✓', 'sprawdzenie'],
        ['Sprawdzenie', '3 + 2 = 5 ✓', 'sprawdzenie'],
        ['Odczytuję współczynniki', 'a = 1, b = −5, c = 6', 'wspolczynniki-trojmianu'],
        ['Odczytuję współczynniki w liczniku', 'a = 2, b = −5, c = −3', 'wspolczynniki-trojmianu'],
        ['Wyznaczam dziedzinę', 'x ≠ 0\nD = ℝ \\ {0}', 'dziedzina'],
        ['Sprawdzam dziedzinę', 'x = 7/2 ∈ D', 'dziedzina'],
        ['Zastrzegam dziedzinę', 'x − 1 ≠ 0\nx ≠ 1', 'dziedzina'],
        ['Odrzucam rozwiązanie spoza dziedziny', 'x = −1 ∈ D\nx = 1 ∉ D', 'dziedzina'],
        ['Rozwiązuję oba przypadki', 'x = 5 lub x = −1', 'wartosc-bezwzgledna'],
        ['Porównuję argumenty logarytmów', 'x + 3 = 2x', 'rownosc-logarytmow'],
        ['Odkładam minus', '−84 = −1 · 84', 'czynniki-pierwsze'],
        ['Dzielę przez kolejne liczby pierwsze', '84 : 2 = 42', 'czynniki-pierwsze'],
        ['Zbieram czynniki pierwsze', '84 = 2 · 2 · 3 · 7 = 2² · 3 · 7', 'czynniki-pierwsze'],
        ['Składam całość', 'x⁶ − 64 = (x − 2)(x + 2)(x² − 2x + 4)(x² + 2x + 4)', 'skladanie-rozkladu'],
        ['Składam całość w mianowniku', 'x⁴ − x² − 12 = (x² + 3)(x − 2)(x + 2)', 'skladanie-rozkladu'],
        ['Składam całość w liczniku', 'x³ + 3x² − 6x − 8 = (x + 1)(x − 2)(x + 4)', 'postac-iloczynowa'],
    ];
    for (const [label, math, id, here] of MAP) {
        const f = rule(label, math);
        ok('„' + label + '” → ' + id + (here ? ' (' + here + ')' : ''), f.id === id && f.here === here, f);
    }
    // sprawdzenie całki to pochodna wyniku, a nie wstawianie liczby — hasło „sprawdzenie” by kłamało
    ok('„Sprawdzenie” całki bez hasła „sprawdzenie”', rule('Sprawdzenie', '(x³/3)′ = x² ✓').id !== 'sprawdzenie', rule('Sprawdzenie', '(x³/3)′ = x² ✓'));
}
{ // dymek z tabeli jest oznaczony, dymek od silnika nie
    const r = S.run('rozwiąż x^2 - 5x + 6 = 0'), st = r.explain.steps;
    const tab = st.find((/** @type {{label: string}} */ s) => s.label === 'Liczę pierwiastek z delty'), eng = st.find((/** @type {{label: string}} */ s) => s.label === 'Liczę deltę');
    ok('dymek z tabeli: formula.fromRule', !!tab && !!tab.formula && tab.formula.fromRule === true, tab);
    ok('dymek od silnika: bez fromRule', !!eng && !!eng.formula && !eng.formula.fromRule, eng);
}
// ── bramka po wszystkich zadaniach ──
const isStatement = (/** @type {string} */ l) => STATEMENTS.some((/** @type {RegExp} */ re) => re.test(l));
/** @type {Map<string, {n: number, ex: string, q: string}>} */
const missing = new Map();
const badId = new Set(), used = new Set();
/** @type {string[]} */
const allLabels = [];
let total = 0, covered = 0;
for (const q of queries) {
    let r; try { r = S.run(q); } catch { continue; }
    if (!r || !r.explain || !r.explain.steps) continue;
    for (const m of r.explain.methods || [r.explain]) for (const s of m.steps) {
        allLabels.push(s.label);
        if (s.formula) {
            if (!FORMULAS[s.formula.id]) badId.add(s.label + ' → ' + s.formula.id);
            if (!isStatement(s.label)) { total++; covered++; }
            continue;
        }
        if (isStatement(s.label)) continue;
        total++;
        const k = kind(s.label);
        if (PENDING.includes(k)) { used.add(k); continue; }
        const e = missing.get(k) || { n: 0, ex: s.label, q: q };
        e.n++;
        missing.set(k, e);
    }
}
ok('każdy formula.id istnieje w słowniku', badId.size === 0, [...badId]);
ok('każdy krok-przekształcenie ma dymek albo jest w PENDING', missing.size === 0,
    [...missing].map(([k, e]) => e.n + '× ' + JSON.stringify(k) + ' (np. „' + e.ex + '” w „' + e.q + '”)'));
const stale = PENDING.filter(k => !used.has(k));
ok('każdy wpis PENDING jest jeszcze potrzebny (usuń zbędne)', stale.length === 0, stale);
// jedno źródło stwierdzeń: step-why nie pisze zdania dokładnie dla STATEMENTS (poza „Granica”, która ma własne zdanie)
{
    const { isStatement: whyStatement } = require(path.join(root, 'js', 'step-why.js'));
    const names = ['Wynik', 'Odpowiedź', 'Równanie', 'Równanie trygonometryczne', 'Wyrażenie', 'Funkcja', 'Całka', 'Układ równań',
        'Nierówność', 'Działanie', 'Liczba', 'Liczby', 'Wynik w przybliżeniu', 'Granica'];
    const differ = [...new Set(names.concat(allLabels))].filter(l => whyStatement(l) !== (isStatement(l) && l !== 'Granica'));
    ok('STATEMENTS zgodne z isStatement w step-why', differ.length === 0, differ);
}
ok('PENDING bez powtórzeń', new Set(PENDING).size === PENDING.length);

console.log('  kroki-przekształcenia:', total, ' z dymkiem:', covered, ' pokrycie:', (100 * covered / Math.max(1, total)).toFixed(1) + '%',
    ' rodzajów w PENDING:', PENDING.length);
console.log(`step-coverage: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
