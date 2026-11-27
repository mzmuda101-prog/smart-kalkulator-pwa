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

// Rodzaje kroków-przekształceń bez hasła: lista jest pusta (pokrycie 100%). Nowy rodzaj kroku bez dymku zatrzymuje bramkę.
const PENDING = /** @type {string[]} */ ([]);

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
{ // podstawy granic (zadanie 4)
    const rule = (/** @type {string} */ label, /** @type {string} */ math) => attachRule({ label: label, math: math }).formula || {};
    /** @type {Array<[string, string, string]>} */
    const LIM = [
        ['Wyłączamy n przed nawias', 'lim(n→∞) n(2 + 1/n)/(n(6 + 5/n))', 'granica-najwyzsza-potega'],
        ['Wyłączamy n² przed nawias', 'lim(n→∞) n²(1 + 3/n)/(n²(2 + 5/n))', 'granica-najwyzsza-potega'],
        ['Wyłączamy najwyższe potęgi przed nawias', 'lim(n→∞) n³(1 + 4/n)/(n⁴(1 + 3/n))', 'granica-najwyzsza-potega'],
        ['Wyłączamy √n przed nawias', 'lim(n→∞) √n(1 + 7/√n)/(√n(√9 + 4/√n))', 'granica-najwyzsza-potega'],
        ['Wyłączamy (−x) przed nawias', 'lim(x→−∞) −(−x)/((−x)√(3 + 5/x²))', 'granica-najwyzsza-potega'],
        ['Skracamy n²', 'lim(n→∞) (1 + 3/n)/(2 + 5/n)', 'granica-najwyzsza-potega'],
        ['Skracamy (−x)', 'lim(x→−∞) −1/√(3 + 5/x²)', 'granica-najwyzsza-potega'],
        ['Skracamy √(−x)', 'lim(x→−∞) 12√(2 − 7/x)/(√(8 − 15/x))', 'granica-najwyzsza-potega'],
        ['Skracamy (x − 4)', 'lim(x→4) (x − 2)/(3x + 2)', 'skracanie-czynnika-w-granicy'],
        ['Skracamy (2x − 1)', 'lim(x→0,5) (x + 1)/(2x + 1)', 'skracanie-czynnika-w-granicy'],
        ['Skracamy (x + 1)²', 'lim(x→−1) (3x + 2)/(2x² − 5)', 'skracanie-czynnika-w-granicy'],
        ['Wyrazy z n w mianowniku dążą do 0', '→ (2 + 0)/(6 + 0) = 1/3', 'granice-podstawowe'],
        ['Wyrazy z x w mianowniku dążą do 0', '→ −1/√(3 + 0) = −√3/3', 'granice-podstawowe'],
        ['Podstawiamy n → ∞', '1/n → 0:  (1 − 0)² = 1', 'granice-podstawowe'],
        ['Podstawiamy x = 4', 'lim(x→4) (x − 2)/(3x + 2) = (4 − 2)/(3 · 4 + 2) = 1/7', 'granica-ciaglosc'],
        ['Podstawiamy x = −0,5', 'lim(x→−0,5) x/3 = (−1/2)/3 = −1/6', 'granica-ciaglosc'],
        ['Granica jednostronna 0⁺', 'licznik → 1, mianownik → 0⁺,  lim(x→0⁺) 1/x = +∞', 'granica-jednostronna'],
        ['Rozbijamy na dwie różnice', 'lim(n→∞) [(√(n² + 9n) − √(n² + 1)) + (√(n² + 5n) − √(n² + 1))]', 'granica-sumy'],
        ['Dodajemy granice', '→ 9/2 + 5/2 = 7', 'granica-sumy'],
        ['Logarytm jest ciągły', '→ log₂(8) = 3', 'ciaglosc-logarytmu'],
        ['Pilnujemy znaku dla x → −∞', '⟦√(x²)⟧ = |x| = −x', 'pierwiastek-z-kwadratu'],
        ['Pilnujemy znaku dla x → −∞', 'x < 0, więc −x > 0', 'liczba-przeciwna'],
    ];
    for (const [label, math, id] of LIM) {
        const f = rule(label, math);
        ok('„' + label + '” → ' + id, f.id === id, f);
    }
    // „Skracamy (x − a)” przy granicy w ∞ to inna reguła niż skracanie czynnika zerującego się w punkcie
    ok('„Podstawiamy x = −0,5”: here = a = −0,5', rule('Podstawiamy x = −0,5', 'lim(x→−0,5) x/3 = −1/6').here === 'a = −0,5', rule('Podstawiamy x = −0,5', 'lim(x→−0,5) x/3 = −1/6'));
    ok('„Skracamy (x − 4)”: here = czynnik', rule('Skracamy (x − 4)', 'lim(x→4) (x − 2)/(3x + 2)').here === 'czynnik = (x − 4)');
    ok('„Skracamy (−x)” w −∞ nie jest skracaniem czynnika z punktu', rule('Skracamy (−x)', 'lim(x→−∞) −1/√(3 + 5/x²)').id !== 'skracanie-czynnika-w-granicy');
}
{ // analiza i reszta (zadanie 5): etykieta -> hasło
    const rule = (/** @type {string} */ label, /** @type {string} */ math) => attachRule({ label: label, math: math }).formula || {};
    /** @type {Array<[string, string, string]>} */
    const MAP5 = [
        ['Stała zostaje przed pochodną', '(5x³)′ = 5 · (x³)′', 'liniowosc-pochodnej'],
        ['Mnożę przez stałą', '5 · 3x² = 15x²', 'liniowosc-pochodnej'],
        ['Stałą wyłączam przed całkę', '∫ 2x dx = 2 · ∫ x dx', 'liniowosc-calki'],
        ['Całka sumy to suma całek', '∫ 2x dx\n+ ∫ 1 dx', 'liniowosc-calki'],
        ['Całkuję stałą', '∫ 1 dx = x', 'calka-potegi'],
        ['Podstawienie: t = 2x + 1', 'dt = 2 dx', 'podstawienie-w-calce'],
        ['Wracam do zmiennej x', '(2x + 1)⁴/8', 'podstawienie-w-calce'],
        ['Wyznaczam A i B', 'x = 1:  1 = 2B,  B = 1/2', 'ulamki-proste'],
        ['Każdy ułamek daje logarytm', 'ln|x − 1|/2 − ln|x + 1|/2', 'ulamki-proste'],
        ['Sprawdzenie', '(x³/3)′ = x² ✓', 'sprawdzenie-calki'],
        ['Dzielę licznik przez mianownik', 'x³ = x · (x² − 1) + x', 'dzielenie-z-reszta'],
        ['Wstawiam A i B', '1/((x + 1)(x − 1)) = (−1/2)/(x + 1) + (1/2)/(x − 1)', 'ulamki-proste'],
        ['Najpierw nawias: dodaję', '2 · 7²', 'kolejnosc-dzialan'],
        ['Potęguję', '2 · 49', 'kolejnosc-dzialan'],
        ['Skracam ułamek', '9/6 = 3/2', 'skracanie-ulamka'],
        ['Skracam (2x − 1)', '(2x − 1)(2x + 1)/(2x − 1) = 2x + 1', 'skracanie-ulamka'],
        ['Upraszczam pierwiastek z delty', '√Δ = √8 = 2√2', 'pierwiastek-iloczynu'],
        ['Wciągam liczbę do nawiasu w liczniku', '2(x + 1/2)(x − 3) = (2x + 1)(x − 3)', 'wciaganie-do-nawiasu'],
        ['Liczę pierwiastek z delty w mianowniku', '√Δ = √196 = 14', 'delta'],
        ['Szukam pierwiastka wśród dzielników w liczniku', 'W(−1) = 0', 'bezout'],
        ['Rozwiązuję podwójną nierówność', '−1 < x < 5', 'wartosc-bezwzgledna'],
        ['Brak miejsc zerowych', 'Δ < 0', 'znak-trojmianu'],
        ['Wyliczam x', 'x = π/12 + kπ lub x = 5π/12 + kπ\nk ∈ ℤ', 'okresowosc'],
        ['Porządkuję równania', 'x − 2y = 0', 'przenoszenie'],
        // „Zapisujemy inaczej” rozbite w silniku na cztery prawdziwe etykiety
        ['Wyłączam liczbę spod pierwiastka', '√(4n² + 2) = √2√(2n² + 1)', 'pierwiastek-iloczynu'],
        ['Wyłączam minus przed ułamek', 'a = −b', 'znak-ulamka'],
        ['Zmieniam znak licznika i mianownika', 'a = b', 'znak-ulamka'],
        ['Wyłączam liczbę przed nawias', '(6x + 3)/(4x² − 1) = 3(2x + 1)/(4x² − 1)', 'wylaczanie-przed-nawias'],
    ];
    for (const [label, math, id] of MAP5) ok('„' + label + '” → ' + id, rule(label, math).id === id, rule(label, math));
    ok('„Sprawdzenie” bez ′ nadal → sprawdzenie', rule('Sprawdzenie', '3 + 2 = 5 ✓').id === 'sprawdzenie');
    ok('PENDING jest pusta (pokrycie 100%)', PENDING.length === 0);
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
/** @type {string[]} */
const threw = [];
/** @type {Record<string, Set<string>>} reguła → rodzaje etykiet, które złapała */
const caught = {};
for (const q of queries) {
    let r; try { r = S.run(q); } catch (e) { threw.push(q + ': ' + /** @type {Error} */ (e).message); continue; }
    if (!r || !r.explain || !r.explain.steps) continue;
    for (const m of r.explain.methods || [r.explain]) for (const s of m.steps) {
        allLabels.push(s.label);
        if (s.formula && s.formula.fromRule) {
            const rule = STEP_RULES.find((/** @type {{re: RegExp, id: string, when?: Function}} */ x) => x.re.test(s.label) && (!x.when || x.when(s)));
            const key = rule ? rule.re.source + ' → ' + rule.id : '?';
            (caught[key] = caught[key] || new Set()).add(kind(s.label));
        }
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
ok('żadne zadanie z listy nie rzuca wyjątku', threw.length === 0, threw);
{ // migawka: szeroki wzorzec, który złapie nową etykietę, pokaże się jako zmiana w pliku (UPDATE=1 zapisuje nową)
    const fs = require('fs'), file = path.join(__dirname, 'fixtures', 'step-rules-labels.json');
    /** @type {Record<string, string[]>} */
    const now = {};
    for (const k of Object.keys(caught).sort()) now[k] = [...caught[k]].sort();
    if (process.env.UPDATE) fs.writeFileSync(file, JSON.stringify(now, null, 2) + '\n');
    const snap = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const diff = [...new Set(Object.keys(now).concat(Object.keys(snap)))].filter(k => JSON.stringify(now[k]) !== JSON.stringify(snap[k]))
        .map(k => k + ': ' + JSON.stringify(snap[k] || []) + ' → ' + JSON.stringify(now[k] || []));
    ok('etykiety złapane przez reguły = test/fixtures/step-rules-labels.json (UPDATE=1 node test/step-coverage.js)', diff.length === 0, diff);
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
