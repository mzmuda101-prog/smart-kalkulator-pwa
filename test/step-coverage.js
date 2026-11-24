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
    "Składam całość", // z czynnikiem kwadratowym, np. „x⁶ − 64 = (x − 2)(x + 2)(x² − 2x + 4)(x² + 2x + 4)” (liniowe → postac-iloczynowa)
    "Sprawdzenie", // 68× „Sprawdzenie”
    "Podstawiamy v = #", // 65× „Podstawiamy x = 4”
    "Wyrazy z v w mianowniku dążą do #", // 53× „Wyrazy z n w mianowniku dążą do 0”
    "Skracamy (…)", // 40× „Skracamy (−x)”
    "Rozkładamy na czynniki", // 37× „Rozkładamy na czynniki”
    "Zapisujemy inaczej", // 27× „Zapisujemy inaczej”
    "Upraszczamy", // 26× „Upraszczamy”
    "Redukuję wyrazy podobne", // 26× „Redukuję wyrazy podobne”
    "Dzielę obie strony przez #", // 24× „Dzielę obie strony przez 2”
    "Przenoszę liczby na prawo", // 20× „Przenoszę liczby na prawo”
    "Wyłączamy v przed nawias", // 19× „Wyłączamy n przed nawias”
    "Skracamy v", // 19× „Skracamy n”
    "Składamy wynik", // 18× „Składamy wynik”
    "Przyrównuję każdy czynnik do zera", // 17× „Przyrównuję każdy czynnik do zera”
    "Granica wykładnika", // 14× „Granica wykładnika”
    "Odczytuję współczynniki", // 14× „Odczytuję współczynniki”
    "Wyznaczam dziedzinę", // 12× „Wyznaczam dziedzinę”
    "Opuszczam nawiasy", // 11× „Opuszczam nawiasy”
    "Szukam pierwiastka wśród dzielników", // 11× „Szukam pierwiastka wśród dzielników”
    "Wyłączamy v² przed nawias", // 10× „Wyłączamy n² przed nawias”
    "Skracamy v²", // 10× „Skracamy n²”
    "Porządkuję i redukuję wyrazy podobne", // 9× „Porządkuję i redukuję wyrazy podobne”
    "Sprawdzam dziedzinę", // 8× „Sprawdzam dziedzinę”
    "Kolorowy ułamek dąży do #", // 8× „Kolorowy ułamek dąży do 1”
    "Stałą wyłączam przed całkę", // 8× „Stałą wyłączam przed całkę”
    "Mnożę przez wyłączoną stałą", // 8× „Mnożę przez wyłączoną stałą”
    "Pierwiastkuję obie strony (…)", // 6× „Pierwiastkuję obie strony (są dwa znaki)”
    "Przenoszę liczbę na prawo", // 6× „Przenoszę liczbę na prawo”
    "Wyłączamy najwyższe potęgi przed nawias", // 5× „Wyłączamy najwyższe potęgi przed nawias”
    "Odczytuję współczynniki w liczniku", // 5× „Odczytuję współczynniki w liczniku”
    "Liczę pierwiastek z delty w liczniku", // 5× „Liczę pierwiastek z delty w liczniku”
    "Wciągam liczbę do nawiasu w liczniku", // 5× „Wciągam liczbę do nawiasu w liczniku”
    "Przenoszę v na lewo, liczby na prawo", // 5× „Przenoszę x na lewo, liczby na prawo”
    "Stała zostaje przed pochodną", // 5× „Stała zostaje przed pochodną”
    "Wyłączamy v³ przed nawias", // 4× „Wyłączamy n³ przed nawias”
    "Wyłączamy √v przed nawias", // 4× „Wyłączamy √n przed nawias”
    "Skracamy √v", // 4× „Skracamy √n”
    "Wyłączamy (…) przed nawias", // 4× „Wyłączamy (−x) przed nawias”
    "Odczytuję współczynniki w mianowniku", // 4× „Odczytuję współczynniki w mianowniku”
    "Liczę pierwiastek z delty w mianowniku", // 4× „Liczę pierwiastek z delty w mianowniku”
    "Wciągam liczbę do nawiasu w mianowniku", // 4× „Wciągam liczbę do nawiasu w mianowniku”
    "Składam całość w liczniku", // 4× „Składam całość w liczniku”
    "Szukam miejsc zerowych", // 4× „Szukam miejsc zerowych”
    "Zastrzegam dziedzinę", // 4× „Zastrzegam dziedzinę”
    "Skracam (…)", // 4× „Skracam (2x − 1)”
    "Rozkładam mianownik", // 4× „Rozkładam mianownik”
    "Zapisuję ułamki proste", // 4× „Zapisuję ułamki proste”
    "Wyznaczam A i B", // 4× „Wyznaczam A i B”
    "Rozkład na ułamki proste", // 4× „Rozkład na ułamki proste”
    "Każdy ułamek daje logarytm", // 4× „Każdy ułamek daje logarytm”
    "Skracamy v³", // 3× „Skracamy n³”
    "Składam całość w mianowniku", // 3× „Składam całość w mianowniku”
    "Przenoszę wszystko na lewą stronę", // 3× „Przenoszę wszystko na lewą stronę”
    "Mnożę przez stałą", // 3× „Mnożę przez stałą”
    "Zamieniam strony", // 3× „Zamieniam strony”
    "Mnożę obie strony przez #", // 3× „Mnożę obie strony przez 2”
    "Zmieniam znak obu stron", // 3× „Zmieniam znak obu stron”
    "Całkuję każdą część", // 3× „Całkuję każdą część”
    "Wracam do zmiennej v", // 3× „Wracam do zmiennej x”
    "Wyłączamy v√v przed nawias", // 2× „Wyłączamy n√n przed nawias”
    "Skracamy v√v", // 2× „Skracamy n√n”
    "Logarytm jest ciągły", // 2× „Logarytm jest ciągły”
    "Rozwiązuję podwójną nierówność", // 2× „Rozwiązuję podwójną nierówność”
    "Mnożę", // 2× „Mnożę”
    "Upraszczam pierwiastek z delty", // 2× „Upraszczam pierwiastek z delty”
    "Kwadrat nie może być ujemny", // 2× „Kwadrat nie może być ujemny”
    "Dzielę przez kolejne liczby pierwsze", // 2× „Dzielę przez kolejne liczby pierwsze”
    "Zbieram czynniki pierwsze", // 2× „Zbieram czynniki pierwsze”
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
    "Przenoszę v na lewo", // 1× „Przenoszę x na lewo”
    "Najpierw nawias: dodaję", // 1× „Najpierw nawias: dodaję”
    "Potęguję", // 1× „Potęguję”
    "Granica jednostronna #⁺", // 1× „Granica jednostronna 0⁺”
    "Wyciągam kwadrat spod pierwiastka", // 1× „Wyciągam kwadrat spod pierwiastka”
    "Podstawiamy v → ∞", // 1× „Podstawiamy n → ∞”
    "Wciągam liczbę do nawiasu", // 1× „Wciągam liczbę do nawiasu”
    "Odkładam minus", // 1× „Odkładam minus”
    "Brak miejsc zerowych", // 1× „Brak miejsc zerowych”
    "Odczytuję znak z paraboli", // 1× „Odczytuję znak z paraboli”
    "Odrzucam rozwiązanie spoza dziedziny", // 1× „Odrzucam rozwiązanie spoza dziedziny”
    "Porównuję argumenty logarytmów", // 1× „Porównuję argumenty logarytmów”
    "Rozwiązuję oba przypadki", // 1× „Rozwiązuję oba przypadki”
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
